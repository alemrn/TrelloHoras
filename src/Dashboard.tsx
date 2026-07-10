import React, { useEffect, useState } from 'react';
import { 
  getBoardMembers, getBoardLists, getBoardCustomFields, getListCards, 
  TrelloMember, TrelloCard 
} from './trelloApi';
import { AlertCircle, CheckCircle2, Clock, Loader2, RefreshCw, LayoutDashboard } from 'lucide-react';
import { motion } from 'motion/react';

const IGNORED_USERS = [
  'Andoni', 'Xabi Eguia', 'Xabier', 'Amaia Valle Gómez', 'Amaia Valle', 'Diego', 
  'Julen', 'Eder', 'Jon Velasco', 'Jonathan Santos', 'Selenium Test'
];

const TARGET_LISTS = ['Desarrollando', 'backlog', 'estimar'];

interface MemberStats {
  member: TrelloMember;
  totalEstimated: number;
  totalInvested: number;
  remainingHours: number;
  
  desarrollandoCards: number;
  desarrollandoCardIds: number[];
  desarrollandoRemainingHours: number;
  desarrollandoEstimated: number;
  desarrollandoInvested: number;
  
  backlogCards: number;
  backlogCardIds: number[];
  backlogRemainingHours: number;

  cardsToEstimate: number;

  needsMoreWork: boolean;
  status: 'good' | 'warning' | 'critical';
}

export const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<MemberStats[]>([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [members, lists, customFields] = await Promise.all([
        getBoardMembers(),
        getBoardLists(),
        getBoardCustomFields(),
      ]);

      // Filter members
      const activeMembers = members.filter(
        m => !IGNORED_USERS.some(ignored => m.fullName.toLowerCase().includes(ignored.toLowerCase()))
      );

      // Filter lists
      const relevantLists = lists.filter(l => 
        TARGET_LISTS.some(target => l.name.toLowerCase().includes(target.toLowerCase()))
      );
      const relevantListIds = relevantLists.map(l => l.id);
      
      // Fetch cards per relevant list
      const cardsResponses = await Promise.all(relevantListIds.map(id => getListCards(id)));
      const cards = cardsResponses.flat();
      
      const listEstimarId = relevantLists.find(l => l.name.toLowerCase().includes('estimar'))?.id;

      // Find custom fields
      const fieldEstimated = customFields.find(cf => cf.name.toLowerCase().includes('estimada'))?.id;
      const fieldInvested = customFields.find(cf => cf.name.toLowerCase().includes('invertida'))?.id;

      // Map stats per member
      const newStats: MemberStats[] = activeMembers.map(member => {
        const memberCards = cards.filter(c => c.idMembers.includes(member.id) && relevantListIds.includes(c.idList));
        
        let totalEstimated = 0;
        let totalInvested = 0;
        let cardsToEstimate = 0;
        
        let desarrollandoCards = 0;
        let desarrollandoCardIds: number[] = [];
        let desarrollandoEstimated = 0;
        let desarrollandoInvested = 0;
        
        let backlogCards = 0;
        let backlogCardIds: number[] = [];
        let backlogEstimated = 0;

        memberCards.forEach(card => {
          let cardEst = 0;
          let cardInv = 0;
          
          if (fieldEstimated) {
            const estItem = card.customFieldItems?.find(item => item.idCustomField === fieldEstimated);
            if (estItem?.value?.number) cardEst = parseFloat(estItem.value.number);
          }
          if (fieldInvested) {
            const invItem = card.customFieldItems?.find(item => item.idCustomField === fieldInvested);
            if (invItem?.value?.number) cardInv = parseFloat(invItem.value.number);
          }
          
          const listName = relevantLists.find(l => l.id === card.idList)?.name.toLowerCase() || '';
          
          if (card.idList === listEstimarId) {
            cardsToEstimate++;
          } else if (listName.includes('desarrollando')) {
            desarrollandoCards++;
            if (card.idShort) desarrollandoCardIds.push(card.idShort);
            desarrollandoEstimated += cardEst;
            desarrollandoInvested += cardInv;
          } else if (listName.includes('backlog')) {
            backlogCards++;
            if (card.idShort) backlogCardIds.push(card.idShort);
            backlogEstimated += cardEst;
          }
        });

        const desarrollandoRemainingHours = Math.max(0, desarrollandoEstimated - desarrollandoInvested);
        const backlogRemainingHours = Math.max(0, backlogEstimated);
        const remainingHours = desarrollandoRemainingHours + backlogRemainingHours;
        
        // Logic for workload status:
        // 3 days view is ~24h. If they have < 24h and 0 cards to estimate, they need work.
        const needsMoreWork = remainingHours < 24 && cardsToEstimate === 0;
        
        let status: 'good' | 'warning' | 'critical' = 'good';
        if (remainingHours < 8 && cardsToEstimate === 0) status = 'critical'; // < 1 day
        else if (remainingHours < 24 && cardsToEstimate === 0) status = 'warning'; // < 3 days
        
        if (cardsToEstimate > 0 && remainingHours < 8) status = 'warning'; // Low hours but has something to estimate

        return {
          member,
          totalEstimated,
          totalInvested,
          remainingHours,
          cardsToEstimate,
          desarrollandoCards,
          desarrollandoCardIds,
          desarrollandoRemainingHours,
          desarrollandoEstimated,
          desarrollandoInvested,
          backlogCards,
          backlogCardIds,
          backlogRemainingHours,
          needsMoreWork,
          status
        };
      });

      // Sort: those who need work first (critical > warning > good, then by remaining hours)
      newStats.sort((a, b) => {
        const weight = { critical: 0, warning: 1, good: 2 };
        if (weight[a.status] !== weight[b.status]) {
          return weight[a.status] - weight[b.status];
        }
        return a.remainingHours - b.remainingHours;
      });

      setStats(newStats);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los datos de Trello. Verifica tus claves en el archivo .env');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)]">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-[var(--brand-primary)]" />
        <p className="text-sm font-medium">Cargando tablero...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[var(--danger-action)]/10 text-[var(--danger-action)] p-6 rounded-xl border border-[var(--danger-action)]/20 flex flex-col items-center text-center">
        <AlertCircle className="w-8 h-8 mb-3" />
        <h3 className="font-bold text-lg mb-2">Error de Conexión</h3>
        <p className="text-sm mb-4">{error}</p>
        <button onClick={fetchData} className="px-4 py-2 bg-[var(--danger-action)] text-white rounded-md font-medium flex items-center gap-2 hover:opacity-90 transition-opacity">
          <RefreshCw className="w-4 h-4" /> Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-[var(--brand-primary)]" />
            Balanceo de Carga
          </h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Revisa quién necesita que se le asigne trabajo a "Estimar" para los próximos días.
          </p>
        </div>
        <button 
          onClick={fetchData}
          className="p-2 bg-[var(--bg-surface-muted)] text-[var(--text-muted)] rounded-lg hover:text-[var(--brand-primary)] transition-colors border border-[var(--border-default)]"
          title="Actualizar datos"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[var(--bg-surface-muted)] border-b border-[var(--border-default)] text-[var(--text-muted)]">
              <tr>
                <th className="px-5 py-4 font-semibold uppercase text-xs tracking-wider">Desarrollador</th>
                <th className="px-5 py-4 font-semibold uppercase text-xs tracking-wider">Desarrollando</th>
                <th className="px-5 py-4 font-semibold uppercase text-xs tracking-wider">Backlog</th>
                <th className="px-5 py-4 font-semibold uppercase text-xs tracking-wider text-center">Por Estimar</th>
                <th className="px-5 py-4 font-semibold uppercase text-xs tracking-wider">Estado (3 días)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-default)]">
              {stats.map(({ member, desarrollandoRemainingHours, desarrollandoEstimated, desarrollandoInvested, desarrollandoCards, desarrollandoCardIds, backlogRemainingHours, backlogCards, backlogCardIds, cardsToEstimate, status }, idx) => {
                
                let devColorClass = "text-green-600 dark:text-green-400";
                if (desarrollandoEstimated > 0) {
                  const ratio = desarrollandoInvested / desarrollandoEstimated;
                  if (desarrollandoInvested > desarrollandoEstimated) {
                    devColorClass = "text-red-600 dark:text-red-400";
                  } else if (ratio >= 0.8) {
                    devColorClass = "text-yellow-600 dark:text-yellow-400";
                  }
                } else if (desarrollandoInvested > 0) {
                  devColorClass = "text-red-600 dark:text-red-400";
                }
                
                return (
                  <motion.tr 
                  key={member.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="hover:bg-[var(--bg-surface-soft)] transition-colors group"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {member.avatarUrl ? (
                        <img src={`${member.avatarUrl}/30.png`} alt={member.fullName} className="w-8 h-8 rounded-full border border-[var(--border-default)]" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] flex items-center justify-center font-bold text-xs border border-[var(--brand-primary)]/20">
                          {member.fullName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="font-bold text-[var(--text-primary)]">{member.fullName}</span>
                    </div>
                  </td>
                  
                  <td className="px-5 py-4 align-top">
                    <div className="flex flex-col">
                      <span className={`font-semibold text-base ${devColorClass}`}>
                        {desarrollandoInvested.toFixed(1)}h / {desarrollandoEstimated.toFixed(1)}h
                      </span>
                      {desarrollandoCardIds.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mt-1.5 max-w-[140px]">
                          {desarrollandoCardIds.map(id => (
                            <span key={id} className="bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border border-[var(--brand-primary)]/20 px-1.5 py-0.5 rounded text-[10px] font-medium leading-none">
                              #{id}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)] mt-1">{desarrollandoCards} tareas</span>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-5 py-4 align-top">
                    <div className="flex flex-col">
                      <span className="font-semibold text-[var(--text-primary)] text-base">{backlogRemainingHours.toFixed(1)}h</span>
                      {backlogCardIds.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mt-1.5 max-w-[140px]">
                          {backlogCardIds.map(id => (
                            <span key={id} className="bg-[var(--bg-surface-muted)] text-[var(--text-primary)] border border-[var(--border-default)] px-1.5 py-0.5 rounded text-[10px] font-medium leading-none">
                              #{id}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)] mt-1">{backlogCards} tareas</span>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-5 py-4 text-center">
                    <div className={`inline-flex items-center justify-center w-8 h-8 rounded-md font-bold text-base
                      ${cardsToEstimate > 0 ? 'bg-[var(--bg-surface-muted)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] opacity-50'}`}>
                      {cardsToEstimate}
                    </div>
                  </td>
                  
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      {status === 'critical' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 font-medium text-xs border border-red-500/20">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Necesita tareas hoy
                        </span>
                      )}
                      {status === 'warning' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-700 dark:text-yellow-500 font-medium text-xs border border-yellow-500/20">
                          <Clock className="w-3.5 h-3.5" />
                          Se quedará libre en breve
                        </span>
                      )}
                      {status === 'good' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 text-green-700 dark:text-green-500 font-medium text-xs border border-green-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Carga adecuada
                        </span>
                      )}
                    </div>
                  </td>
                </motion.tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
