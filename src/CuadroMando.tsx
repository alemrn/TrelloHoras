import React from 'react';
import { useTrelloStats } from './hooks/useTrelloStats';
import { AlertCircle, Loader2, RefreshCw, BarChart2 } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'motion/react';

const COLORS = {
  Desarrollando: '#3b82f6', // blue
  Backlog: '#8b5cf6',       // purple
  'Bugs': '#ef4444',
  'Bugs Recep.': '#fca5a5', // red-300
  'Bugs Invest.': '#ef4444',// red-500
  'Bugs Estim.': '#991b1b', // red-800
  'Rev. Est.': '#f59e0b',   // orange
  PR: '#22c55e',            // green
  'Por Estimar': '#14b8a6', // teal
};

export const CuadroMando: React.FC = () => {
  const { stats, loading, error, fetchData } = useTrelloStats();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)]">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-[var(--brand-primary)]" />
        <p className="text-sm font-medium">Cargando cuadro de mando...</p>
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
            <BarChart2 className="w-6 h-6 text-[var(--brand-primary)]" />
            Cuadro de Mando
          </h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Resumen visual del estado de trabajo por cada usuario.
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

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-5">
        {[...stats].sort((a, b) => a.member.fullName.localeCompare(b.member.fullName)).map((stat, idx) => {
          const data = [
            { name: 'Desarrollando', value: stat.desarrollandoCards, suffix: 't' },
            { name: 'Backlog', value: stat.backlogCards, suffix: 't' },
            { name: 'Bugs Recep.', value: stat.bugRecepcionCards, suffix: 't' },
            { name: 'Bugs Invest.', value: stat.bugInvestigacionCards, suffix: 't' },
            { name: 'Bugs Estim.', value: stat.bugEstimacionCards, suffix: 't' },
            { name: 'Rev. Est.', value: stat.revisionEstimacionCards, suffix: 't' },
            { name: 'PR', value: stat.prCards, suffix: 't' },
            { name: 'Por Estimar', value: stat.cardsToEstimate, suffix: 't' }
          ].filter(item => item.value > 0);

          return (
            <motion.div 
              key={stat.member.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-[var(--bg-surface)] p-4 rounded-xl border border-[var(--border-default)] shadow-sm hover:shadow-md transition-shadow flex flex-col"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  {stat.member.avatarUrl ? (
                    <img src={`${stat.member.avatarUrl}/50.png`} alt={stat.member.fullName} className="w-8 h-8 rounded-full border border-[var(--border-default)]" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] flex items-center justify-center font-bold text-xs border border-[var(--brand-primary)]/20">
                      {stat.member.fullName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-sm text-[var(--text-primary)] leading-tight">{stat.member.fullName.split(' ').slice(0, 2).join(' ')}</h3>
                    <p className="text-[10px] text-[var(--text-muted)] leading-tight mt-0.5">
                      {stat.remainingHours.toFixed(1)}h rest.
                    </p>
                  </div>
                </div>

                {(stat.bugEstimacionCards > 0 || stat.revisionEstimacionCards > 0 || stat.prCards > 0) && (
                  <div className="flex flex-col gap-1 items-end">
                    {stat.bugEstimacionCards > 0 && (
                      <div className="animate-pulse flex items-center gap-1 bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-500/20 px-1.5 py-0.5 rounded text-[9px] font-bold shadow-sm uppercase tracking-wider">
                        <AlertCircle className="w-3 h-3 flex-shrink-0" />
                        Est. BUGS
                      </div>
                    )}
                    {stat.revisionEstimacionCards > 0 && (
                      <div className="animate-pulse flex items-center gap-1 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-500/20 px-1.5 py-0.5 rounded text-[9px] font-bold shadow-sm uppercase tracking-wider">
                        <AlertCircle className="w-3 h-3 flex-shrink-0" />
                        Estimación
                      </div>
                    )}
                    {stat.prCards > 0 && (
                      <div className="animate-pulse flex items-center gap-1 bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded text-[9px] font-bold shadow-sm uppercase tracking-wider">
                        <AlertCircle className="w-3 h-3 flex-shrink-0" />
                        Revisar PR
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex-1 space-y-1.5 mb-4">
                <div className="flex justify-between items-center text-xs py-1.5 px-2 rounded-md bg-[var(--bg-surface-muted)]">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS['Desarrollando'] }}></div>
                    <span className="text-[var(--text-primary)] font-medium">Desarrollando</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-[var(--text-primary)] block leading-none">{stat.desarrollandoCards} tareas</span>
                    <span className="text-xs text-[var(--text-muted)]">{stat.desarrollandoInvested.toFixed(1)}h / {stat.desarrollandoEstimated.toFixed(1)}h</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs py-1.5 px-2 rounded-md bg-[var(--bg-surface-muted)]">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS['Backlog'] }}></div>
                    <span className="text-[var(--text-primary)] font-medium">Backlog</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-[var(--text-primary)] block leading-none">{stat.backlogCards} tareas</span>
                    <span className="text-xs text-[var(--text-muted)]">{stat.backlogRemainingHours.toFixed(1)}h rest.</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs py-1.5 px-2 rounded-md bg-[var(--bg-surface-muted)]">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS['Bugs'] }}></div>
                    <span className="text-[var(--text-primary)] font-medium">Bugs</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-[var(--text-muted)] block leading-none">
                      <span className={stat.bugRecepcionCards + stat.bugInvestigacionCards + stat.bugEstimacionCards > 0 ? "text-[var(--text-primary)]" : ""}>
                        {stat.bugRecepcionCards + stat.bugInvestigacionCards + stat.bugEstimacionCards}
                      </span> tareas
                    </span>
                    {(stat.bugRecepcionCards + stat.bugInvestigacionCards + stat.bugEstimacionCards > 0) && (
                      <span className="text-xs text-[var(--text-muted)] flex gap-2 mt-1 justify-end font-medium">
                        <span title="Recepción">R:{stat.bugRecepcionCards}</span>
                        <span title="Investigación">I:{stat.bugInvestigacionCards}</span>
                        <span title="Estimación">E:{stat.bugEstimacionCards}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs py-1.5 px-2 rounded-md bg-[var(--bg-surface-muted)]">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS['Rev. Est.'] }}></div>
                    <span className="text-[var(--text-primary)] font-medium">Revisar Estimación</span>
                  </div>
                  <span className="font-bold text-[var(--text-muted)]">
                    <span className={stat.revisionEstimacionCards > 0 ? "text-[var(--text-primary)]" : ""}>{stat.revisionEstimacionCards}</span> tareas
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs py-1.5 px-2 rounded-md bg-[var(--bg-surface-muted)]">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS['PR'] }}></div>
                    <span className="text-[var(--text-primary)] font-medium">En PR</span>
                  </div>
                  <span className="font-bold text-[var(--text-muted)]">
                    <span className={stat.prCards > 0 ? "text-[var(--text-primary)]" : ""}>{stat.prCards}</span> tareas
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs py-1.5 px-2 rounded-md bg-[var(--bg-surface-muted)]">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS['Por Estimar'] }}></div>
                    <span className="text-[var(--text-primary)] font-medium">Por Estimar</span>
                  </div>
                  <span className="font-bold text-[var(--text-muted)]">
                    <span className={stat.cardsToEstimate > 0 ? "text-[var(--text-primary)]" : ""}>{stat.cardsToEstimate}</span> tareas
                  </span>
                </div>
              </div>

              <div className="h-32 w-full mt-auto border-t border-[var(--border-default)] pt-3 relative">
                {data.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={data} 
                          cx="50%" 
                          cy="50%" 
                          innerRadius={30} 
                          outerRadius={50} 
                          paddingAngle={3} 
                          dataKey="value"
                        >
                          {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || '#8884d8'} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number, name: string, props: any) => [`${value}${props.payload.suffix === 'h' ? ' hrs' : ' tareas'}`, name]}
                          contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-default)', borderRadius: '0.5rem', color: 'var(--text-primary)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          itemStyle={{ color: 'var(--text-primary)', fontWeight: 'bold' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-[var(--text-muted)]">
                    Sin tareas asignadas
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
