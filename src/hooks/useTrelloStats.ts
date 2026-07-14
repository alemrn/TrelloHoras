import { useState, useEffect } from 'react';
import { 
  getBoardMembers, getBoardLists, getBoardCustomFields, getListCards, 
  TrelloMember 
} from '../trelloApi';

const IGNORED_USERS = [
  'Andoni', 'Xabi Eguia', 'Xabier', 'Amaia Valle Gómez', 'Amaia Valle', 'Diego', 
  'Julen', 'Eder', 'Jon Velasco', 'Jonathan Santos', 'Selenium Test'
];

const TARGET_LISTS = ['desarrollando', 'backlog', 'estimar', 'revisión estimación', 'pr', 'recepción bugs', 'bugs - investigación', 'bugs - estimación'];

export interface CardInfo {
  id: number;
  url: string;
}

export interface MemberStats {
  member: TrelloMember;
  totalEstimated: number;
  totalInvested: number;
  remainingHours: number;
  
  desarrollandoCards: number;
  desarrollandoCardIds: CardInfo[];
  desarrollandoRemainingHours: number;
  desarrollandoEstimated: number;
  desarrollandoInvested: number;
  
  backlogCards: number;
  backlogCardIds: CardInfo[];
  backlogRemainingHours: number;

  cardsToEstimate: number;
  estimarCardIds: CardInfo[];

  revisionEstimacionCards: number;
  revisionEstimacionCardIds: CardInfo[];

  prCards: number;
  prCardIds: CardInfo[];

  bugRecepcionCards: number;
  bugRecepcionCardIds: CardInfo[];
  bugInvestigacionCards: number;
  bugInvestigacionCardIds: CardInfo[];
  bugEstimacionCards: number;
  bugEstimacionCardIds: CardInfo[];

  needsMoreWork: boolean;
  status: 'good' | 'warning' | 'critical';
}

export function useTrelloStats() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<MemberStats[]>([]);
  const [globalWarnings, setGlobalWarnings] = useState({ revisionEstimacion: 0, prs: 0, bugsEstimacion: 0 });

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
        TARGET_LISTS.includes(l.name.trim().toLowerCase())
      );
      const relevantListIds = relevantLists.map(l => l.id);
      
      // Fetch cards per relevant list
      const cardsResponses = await Promise.all(relevantListIds.map(id => getListCards(id)));
      const cards = cardsResponses.flat().filter(c => c.name !== 'Validación de copias de seguridad');
      
      const andoniId = members.find(m => m.fullName.toLowerCase().includes('andoni'))?.id;

      const revisionEstimacionListId = relevantLists.find(l => l.name.trim().toLowerCase() === 'revisión estimación')?.id;
      const prListId = relevantLists.find(l => l.name.trim().toLowerCase() === 'pr')?.id;
      const listEstimarId = relevantLists.find(l => l.name.trim().toLowerCase() === 'estimar')?.id;
      const bugsEstimacionListId = relevantLists.find(l => l.name.trim().toLowerCase() === 'bugs - estimación')?.id;

      const revEstCount = cards.filter(c => c.idList === revisionEstimacionListId).length;
      const prCount = cards.filter(c => c.idList === prListId && (!andoniId || !c.idMembers.includes(andoniId))).length;
      const bugsEstCount = cards.filter(c => c.idList === bugsEstimacionListId).length;
      
      setGlobalWarnings({ revisionEstimacion: revEstCount, prs: prCount, bugsEstimacion: bugsEstCount });

      // Find custom fields
      const fieldEstimated = customFields.find(cf => cf.name.toLowerCase().includes('estimada'))?.id;
      const fieldInvested = customFields.find(cf => cf.name.toLowerCase().includes('invertida'))?.id;

      // Map stats per member
      const newStats: MemberStats[] = activeMembers.map(member => {
        const memberCards = cards.filter(c => c.idMembers.includes(member.id) && relevantListIds.includes(c.idList));
        
        let totalEstimated = 0;
        let totalInvested = 0;
        let cardsToEstimate = 0;
        let estimarCardIds: CardInfo[] = [];
        
        let desarrollandoCards = 0;
        let desarrollandoCardIds: CardInfo[] = [];
        let desarrollandoEstimated = 0;
        let desarrollandoInvested = 0;
        
        let backlogCards = 0;
        let backlogCardIds: CardInfo[] = [];
        let backlogEstimated = 0;

        let revisionEstimacionCards = 0;
        let revisionEstimacionCardIds: CardInfo[] = [];

        let prCards = 0;
        let prCardIds: CardInfo[] = [];

        let bugRecepcionCards = 0;
        let bugRecepcionCardIds: CardInfo[] = [];

        let bugInvestigacionCards = 0;
        let bugInvestigacionCardIds: CardInfo[] = [];

        let bugEstimacionCards = 0;
        let bugEstimacionCardIds: CardInfo[] = [];

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
          
          const listName = relevantLists.find(l => l.id === card.idList)?.name.trim().toLowerCase() || '';
          
          if (listName === 'estimar') {
            cardsToEstimate++;
            if (card.idShort && card.url) estimarCardIds.push({ id: card.idShort, url: card.url });
          } else if (listName === 'desarrollando') {
            desarrollandoCards++;
            if (card.idShort && card.url) desarrollandoCardIds.push({ id: card.idShort, url: card.url });
            desarrollandoEstimated += cardEst;
            desarrollandoInvested += cardInv;
          } else if (listName === 'backlog') {
            backlogCards++;
            if (card.idShort && card.url) backlogCardIds.push({ id: card.idShort, url: card.url });
            backlogEstimated += cardEst;
          } else if (listName === 'revisión estimación') {
            revisionEstimacionCards++;
            if (card.idShort && card.url) revisionEstimacionCardIds.push({ id: card.idShort, url: card.url });
          } else if (listName === 'pr') {
            if (andoniId && card.idMembers.includes(andoniId)) {
              return; // Ignore this PR card if assigned to Andoni
            }
            prCards++;
            if (card.idShort && card.url) prCardIds.push({ id: card.idShort, url: card.url });
          } else if (listName === 'recepción bugs') {
            bugRecepcionCards++;
            if (card.idShort && card.url) bugRecepcionCardIds.push({ id: card.idShort, url: card.url });
          } else if (listName === 'bugs - investigación') {
            bugInvestigacionCards++;
            if (card.idShort && card.url) bugInvestigacionCardIds.push({ id: card.idShort, url: card.url });
          } else if (listName === 'bugs - estimación') {
            bugEstimacionCards++;
            if (card.idShort && card.url) bugEstimacionCardIds.push({ id: card.idShort, url: card.url });
          }
        });

        const desarrollandoRemainingHours = Math.max(0, desarrollandoEstimated - desarrollandoInvested);
        const backlogRemainingHours = Math.max(0, backlogEstimated);
        const remainingHours = desarrollandoRemainingHours + backlogRemainingHours;
        
        // Logic for workload status:
        const hasPendingTasks = cardsToEstimate > 0 || bugRecepcionCards > 0 || bugInvestigacionCards > 0;
        const needsMoreWork = remainingHours < 24 && !hasPendingTasks;
        
        let status: 'good' | 'warning' | 'critical' = 'good';
        if (remainingHours < 8 && !hasPendingTasks) status = 'critical';
        else if (remainingHours < 24 && !hasPendingTasks) status = 'warning';
        
        if (hasPendingTasks && remainingHours < 8) status = 'warning'; // Low hours but has something to do

        return {
          member,
          totalEstimated,
          totalInvested,
          remainingHours,
          cardsToEstimate,
          estimarCardIds,
          desarrollandoCards,
          desarrollandoCardIds,
          desarrollandoRemainingHours,
          desarrollandoEstimated,
          desarrollandoInvested,
          backlogCards,
          backlogCardIds,
          backlogRemainingHours,
          revisionEstimacionCards,
          revisionEstimacionCardIds,
          prCards,
          prCardIds,
          bugRecepcionCards,
          bugRecepcionCardIds,
          bugInvestigacionCards,
          bugInvestigacionCardIds,
          bugEstimacionCards,
          bugEstimacionCardIds,
          needsMoreWork,
          status
        } as MemberStats;
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

  return { stats, globalWarnings, loading, error, fetchData };
}
