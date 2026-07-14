import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, Loader2, RefreshCw, LayoutDashboard } from 'lucide-react';
import { motion } from 'motion/react';
import { useTrelloStats } from './hooks/useTrelloStats';

export const Dashboard: React.FC = () => {
  const { stats, globalWarnings, loading, error, fetchData } = useTrelloStats();
  const [expandedEstimar, setExpandedEstimar] = useState<Set<string>>(new Set());
  const [expandedBugs, setExpandedBugs] = useState<Set<string>>(new Set());

  const toggleEstimar = (memberId: string) => {
    setExpandedEstimar(prev => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  };

  const toggleBugs = (memberId: string) => {
    setExpandedBugs(prev => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  };

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
        <div className="flex items-center gap-3">
          {globalWarnings.revisionEstimacion > 0 && (
            <div className="animate-pulse flex items-center gap-2 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-500/20 px-3 py-1.5 rounded-lg font-bold text-sm shadow-sm">
              <AlertCircle className="w-4 h-4" />
              Revisar estimación
            </div>
          )}
          {globalWarnings.prs > 0 && (
            <div className="animate-pulse flex items-center gap-2 bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 px-3 py-1.5 rounded-lg font-bold text-sm shadow-sm">
              <AlertCircle className="w-4 h-4" />
              Revisar PRs
            </div>
          )}
          {globalWarnings.bugsEstimacion > 0 && (
            <div className="animate-pulse flex items-center gap-2 bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-500/20 px-3 py-1.5 rounded-lg font-bold text-sm shadow-sm">
              <AlertCircle className="w-4 h-4" />
              Revisar estim. BUGS
            </div>
          )}
          <button 
            onClick={fetchData}
            className="p-2 bg-[var(--bg-surface-muted)] text-[var(--text-muted)] rounded-lg hover:text-[var(--brand-primary)] transition-colors border border-[var(--border-default)]"
            title="Actualizar datos"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[var(--bg-surface-muted)] border-b border-[var(--border-default)] text-[var(--text-muted)]">
              <tr>
                <th className="px-2 py-3 font-semibold uppercase text-xs tracking-wider">Desarrollador</th>
                <th className="px-2 py-3 font-semibold uppercase text-xs tracking-wider">Desarrollando</th>
                <th className="px-2 py-3 font-semibold uppercase text-xs tracking-wider">Backlog</th>
                <th className="px-2 py-3 font-semibold uppercase text-xs tracking-wider text-center">Por Estimar</th>
                <th className="px-2 py-3 font-semibold uppercase text-xs tracking-wider text-center">BUGS</th>
                <th className="px-2 py-3 font-semibold uppercase text-xs tracking-wider text-center">Rev. Est.</th>
                <th className="px-2 py-3 font-semibold uppercase text-xs tracking-wider text-center">PR</th>
                <th className="px-2 py-3 font-semibold uppercase text-xs tracking-wider">Estado (3 días)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-default)]">
              {stats.map(({ member, desarrollandoRemainingHours, desarrollandoEstimated, desarrollandoInvested, desarrollandoCards, desarrollandoCardIds, backlogRemainingHours, backlogCards, backlogCardIds, cardsToEstimate, estimarCardIds, revisionEstimacionCards, revisionEstimacionCardIds, prCards, prCardIds, bugRecepcionCards, bugRecepcionCardIds, bugInvestigacionCards, bugInvestigacionCardIds, bugEstimacionCards, bugEstimacionCardIds, status }, idx) => {
                
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
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-3">
                      {member.avatarUrl ? (
                        <img src={`${member.avatarUrl}/30.png`} alt={member.fullName} className="w-8 h-8 rounded-full border border-[var(--border-default)]" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] flex items-center justify-center font-bold text-xs border border-[var(--brand-primary)]/20">
                          {member.fullName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="font-bold text-[var(--text-primary)]">{member.fullName.split(' ').slice(0, 2).join(' ')}</span>
                    </div>
                  </td>
                  
                  <td className="px-2 py-3 align-top">
                    <div className="flex flex-col">
                      <span className={`font-semibold text-base ${devColorClass}`}>
                        {desarrollandoInvested.toFixed(1)}h / {desarrollandoEstimated.toFixed(1)}h
                      </span>
                      {desarrollandoCardIds.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mt-1.5 max-w-[140px]">
                          {desarrollandoCardIds.map(info => (
                            <a key={info.id} href={info.url} target="_blank" rel="noopener noreferrer" className="bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border border-[var(--brand-primary)]/20 px-1.5 py-0.5 rounded text-[10px] font-medium leading-none hover:bg-[var(--brand-primary)]/20 transition-colors">
                              #{info.id}
                            </a>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)] mt-1">{desarrollandoCards} tareas</span>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-2 py-3 align-top">
                    <div className="flex flex-col">
                      <span className="font-semibold text-[var(--text-primary)] text-base">{backlogRemainingHours.toFixed(1)}h</span>
                      {backlogCardIds.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mt-1.5 max-w-[140px]">
                          {backlogCardIds.map(info => (
                            <a key={info.id} href={info.url} target="_blank" rel="noopener noreferrer" className="bg-[var(--bg-surface-muted)] text-[var(--text-primary)] border border-[var(--border-default)] px-1.5 py-0.5 rounded text-[10px] font-medium leading-none hover:bg-[var(--border-default)] transition-colors">
                              #{info.id}
                            </a>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)] mt-1">{backlogCards} tareas</span>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-2 py-3 text-center">
                    <div className="flex flex-col items-center">
                      <button 
                        onClick={() => toggleEstimar(member.id)}
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-md font-bold text-base cursor-pointer hover:opacity-80 transition-opacity
                        ${cardsToEstimate > 0 ? 'bg-[var(--bg-surface-muted)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] opacity-50'}`}>
                        {cardsToEstimate}
                      </button>
                      
                      {expandedEstimar.has(member.id) && estimarCardIds.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-1 mt-2 max-w-[140px]">
                          {estimarCardIds.map(info => (
                            <a key={info.id} href={info.url} target="_blank" rel="noopener noreferrer" className="bg-[var(--bg-surface-muted)] text-[var(--text-primary)] border border-[var(--border-default)] px-1.5 py-0.5 rounded text-[10px] font-medium leading-none hover:bg-[var(--border-default)] transition-colors">
                              #{info.id}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-2 py-3 text-center">
                    <div className="flex justify-center gap-2">
                      
                      <div className="flex flex-col items-center min-w-[40px]">
                        <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] mb-1">Recep.</span>
                        <button 
                          onClick={() => toggleBugs(member.id)}
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-md font-bold text-base cursor-pointer hover:opacity-80 transition-opacity ${bugRecepcionCards > 0 ? 'bg-[var(--bg-surface-muted)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] opacity-50'}`}>
                          {bugRecepcionCards}
                        </button>
                        {expandedBugs.has(member.id) && bugRecepcionCardIds.length > 0 && (
                          <div className="flex flex-wrap justify-center gap-1 mt-1.5 max-w-[110px]">
                            {bugRecepcionCardIds.map(info => (
                              <a key={info.id} href={info.url} target="_blank" rel="noopener noreferrer" className="bg-[var(--bg-surface-muted)] text-[var(--text-primary)] border border-[var(--border-default)] px-1.5 py-0.5 rounded text-[10px] font-medium leading-none hover:bg-[var(--border-default)] transition-colors">
                                #{info.id}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col items-center min-w-[40px]">
                        <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] mb-1">Investig.</span>
                        <button 
                          onClick={() => toggleBugs(member.id)}
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-md font-bold text-base cursor-pointer hover:opacity-80 transition-opacity ${bugInvestigacionCards > 0 ? 'bg-[var(--bg-surface-muted)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] opacity-50'}`}>
                          {bugInvestigacionCards}
                        </button>
                        {expandedBugs.has(member.id) && bugInvestigacionCardIds.length > 0 && (
                          <div className="flex flex-wrap justify-center gap-1 mt-1.5 max-w-[110px]">
                            {bugInvestigacionCardIds.map(info => (
                              <a key={info.id} href={info.url} target="_blank" rel="noopener noreferrer" className="bg-[var(--bg-surface-muted)] text-[var(--text-primary)] border border-[var(--border-default)] px-1.5 py-0.5 rounded text-[10px] font-medium leading-none hover:bg-[var(--border-default)] transition-colors">
                                #{info.id}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-center min-w-[40px]">
                        <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] mb-1">Estim.</span>
                        <button 
                          onClick={() => toggleBugs(member.id)}
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-md font-bold text-base cursor-pointer hover:opacity-80 transition-opacity ${bugEstimacionCards > 0 ? 'bg-[var(--bg-surface-muted)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] opacity-50'}`}>
                          {bugEstimacionCards}
                        </button>
                        {expandedBugs.has(member.id) && bugEstimacionCardIds.length > 0 && (
                          <div className="flex flex-wrap justify-center gap-1 mt-1.5 max-w-[110px]">
                            {bugEstimacionCardIds.map(info => (
                              <a key={info.id} href={info.url} target="_blank" rel="noopener noreferrer" className="bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-500/20 px-1.5 py-0.5 rounded text-[10px] font-medium leading-none hover:bg-orange-500/20 transition-colors">
                                #{info.id}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-2 py-3 text-center">
                    <div className="flex flex-col items-center">
                      <div className={`inline-flex items-center justify-center w-8 h-8 font-bold text-base ${revisionEstimacionCards > 0 ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] opacity-50'}`}>
                        {revisionEstimacionCards}
                      </div>
                      {revisionEstimacionCardIds.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-1 mt-1.5 max-w-[140px]">
                          {revisionEstimacionCardIds.map(info => (
                            <a key={info.id} href={info.url} target="_blank" rel="noopener noreferrer" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-500/20 px-1.5 py-0.5 rounded text-[10px] font-medium leading-none hover:bg-yellow-500/20 transition-colors">
                              #{info.id}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-2 py-3 text-center">
                    <div className="flex flex-col items-center">
                      <div className={`inline-flex items-center justify-center w-8 h-8 font-bold text-base ${prCards > 0 ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] opacity-50'}`}>
                        {prCards}
                      </div>
                      {prCardIds.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-1 mt-1.5 max-w-[140px]">
                          {prCardIds.map(info => (
                            <a key={info.id} href={info.url} target="_blank" rel="noopener noreferrer" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded text-[10px] font-medium leading-none hover:bg-blue-500/20 transition-colors">
                              #{info.id}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-2">
                      {status === 'critical' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 font-medium text-xs border border-red-500/20">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Necesita tareas
                        </span>
                      )}
                      {status === 'warning' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-700 dark:text-yellow-500 font-medium text-xs border border-yellow-500/20">
                          <Clock className="w-3.5 h-3.5" />
                          Libre en breve
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
