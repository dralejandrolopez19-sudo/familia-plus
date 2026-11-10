import React, { useState } from 'react';
import { Plus, Trash2, Network, Users, HeartHandshake, CheckCircle2 } from 'lucide-react';
import { HouseholdMemberItem } from '../data/clinicalFormsData';

export interface GenogramNode {
  id: string;
  name: string;
  age: string;
  sex: 'M' | 'F';
  generation: 1 | 2 | 3; // 1: Abuelos, 2: Padres / Paciente Índice, 3: Hijos
  isIndexPatient: boolean;
  isDeceased: boolean;
  isPregnant: boolean;
  chronicCondition: string;
}

export interface GenogramRelation {
  id: string;
  fromName: string;
  toName: string;
  type:
    | 'Matrimonio legal'
    | 'Unión libre / Consensual'
    | 'Separación / Divorcio'
    | 'Relación muy estrecha (Apoyo)'
    | 'Relación conflictiva / Tensión';
}

export interface EcomapaConnection {
  id: string;
  networkName: string;
  category:
    | 'UNAP / Centro de Salud'
    | 'Familia Extendida'
    | 'Iglesia / Comunidad Religiosa'
    | 'Escuela / Universidad'
    | 'Trabajo / Seguro ARS'
    | 'Junta de Vecinos / Club';
  strength: 'Fuerte (Apoyo activo)' | 'Débil / Ocasional' | 'Estresante / Conflicto';
  notes: string;
}

interface FamiliogramaEcomapaCanvasProps {
  patientName: string;
  patientAge: number;
  patientGender: 'Masculino' | 'Femenino';
  familyMembers: HouseholdMemberItem[];
  onSaveSummaryToFamilyRecord?: (summaryText: string) => void;
  onTriggerToast: (msg: string) => void;
}

export const FamiliogramaEcomapaCanvas: React.FC<FamiliogramaEcomapaCanvasProps> = ({
  patientName,
  patientAge,
  patientGender,
  familyMembers,
  onSaveSummaryToFamilyRecord,
  onTriggerToast,
}) => {
  const storageKey = `familia_plus_genogram_v2_${patientName.replace(/\s+/g, '_').toLowerCase()}`;

  const [nodes, setNodes] = useState<GenogramNode[]>(() => {
    try {
      const saved = localStorage.getItem(`${storageKey}_nodes`);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    const initialNodes: GenogramNode[] = [
      {
        id: 'node-index',
        name: patientName,
        age: String(patientAge || 35),
        sex: patientGender === 'Masculino' ? 'M' : 'F',
        generation: 2,
        isIndexPatient: true,
        isDeceased: false,
        isPregnant: false,
        chronicCondition: 'Caso Índice',
      },
    ];
    familyMembers.forEach((m, idx) => {
      if (m.parentesco.toLowerCase().includes('jefe') && idx === 0) return;
      const gen: 1 | 2 | 3 =
        /abuel|padre|madre|tío|tia/i.test(m.parentesco)
          ? 1
          : /hijo|nieta|nieto|sobrin/i.test(m.parentesco)
          ? 3
          : 2;
      initialNodes.push({
        id: `node-fam-${m.id}`,
        name: `${m.nombreCompleto} (${m.parentesco})`,
        age: String(m.edad),
        sex: m.sexo,
        generation: gen,
        isIndexPatient: false,
        isDeceased: false,
        isPregnant: /embaraz|gestante/i.test(m.condicionSalud),
        chronicCondition: m.condicionSalud,
      });
    });
    return initialNodes;
  });

  const [relations, setRelations] = useState<GenogramRelation[]>(() => {
    try {
      const saved = localStorage.getItem(`${storageKey}_relations`);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [
      {
        id: 'rel-1',
        fromName: patientName,
        toName: 'Núcleo Familiar Principal',
        type: 'Relación muy estrecha (Apoyo)',
      },
    ];
  });

  const [ecomapa, setEcomapa] = useState<EcomapaConnection[]>(() => {
    try {
      const saved = localStorage.getItem(`${storageKey}_ecomapa`);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [
      {
        id: 'eco-1',
        networkName: 'UNAP / Consultorio Medicina Familiar',
        category: 'UNAP / Centro de Salud',
        strength: 'Fuerte (Apoyo activo)',
        notes: 'Seguimiento continuo y adscripción familiar',
      },
      {
        id: 'eco-2',
        networkName: 'Red de Familia Extendida',
        category: 'Familia Extendida',
        strength: 'Fuerte (Apoyo activo)',
        notes: 'Apoyo en cuidados y emergencias',
      },
      {
        id: 'eco-3',
        networkName: 'Seguro ARS / Trabajo',
        category: 'Trabajo / Seguro ARS',
        strength: 'Fuerte (Apoyo activo)',
        notes: 'Cobertura de medicamentos y laboratorios',
      },
    ];
  });

  // New node inputs
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeAge, setNewNodeAge] = useState('40');
  const [newNodeSex, setNewNodeSex] = useState<'F' | 'M'>('F');
  const [newNodeGen, setNewNodeGen] = useState<1 | 2 | 3>(2);
  const [newNodeCond, setNewNodeCond] = useState('Sano');
  const [newNodeDeceased, setNewNodeDeceased] = useState(false);

  // New relation inputs
  const [relFrom, setRelFrom] = useState(patientName);
  const [relTo, setRelTo] = useState('');
  const [relType, setRelType] = useState<GenogramRelation['type']>('Unión libre / Consensual');

  // New Ecomapa connection inputs
  const [ecoCategory, setEcoCategory] =
    useState<EcomapaConnection['category']>('Iglesia / Comunidad Religiosa');
  const [ecoStrength, setEcoStrength] =
    useState<EcomapaConnection['strength']>('Fuerte (Apoyo activo)');
  const [ecoNotes, setEcoNotes] = useState('');

  const persistAll = (
    nextNodes: GenogramNode[],
    nextRels: GenogramRelation[],
    nextEco: EcomapaConnection[]
  ) => {
    try {
      localStorage.setItem(`${storageKey}_nodes`, JSON.stringify(nextNodes));
      localStorage.setItem(`${storageKey}_relations`, JSON.stringify(nextRels));
      localStorage.setItem(`${storageKey}_ecomapa`, JSON.stringify(nextEco));
    } catch {
      // ignore
    }
  };

  const handleAddNode = () => {
    if (!newNodeName.trim()) return;
    const next: GenogramNode[] = [
      ...nodes,
      {
        id: `gn-${Date.now()}`,
        name: newNodeName.trim(),
        age: newNodeAge.trim() || '—',
        sex: newNodeSex,
        generation: newNodeGen,
        isIndexPatient: false,
        isDeceased: newNodeDeceased,
        isPregnant: false,
        chronicCondition: newNodeCond.trim() || 'Sano',
      },
    ];
    setNodes(next);
    persistAll(next, relations, ecomapa);
    setNewNodeName('');
    onTriggerToast(`Integrante añadido al Familiograma: ${newNodeName.trim()}`);
  };

  const handleAddRelation = () => {
    if (!relTo.trim()) return;
    const next: GenogramRelation[] = [
      ...relations,
      {
        id: `gr-${Date.now()}`,
        fromName: relFrom || patientName,
        toName: relTo.trim(),
        type: relType,
      },
    ];
    setRelations(next);
    persistAll(nodes, next, ecomapa);
    setRelTo('');
    onTriggerToast(`Vínculo familiar registrado: ${relType}`);
  };

  const handleAddEcomapa = () => {
    const next: EcomapaConnection[] = [
      ...ecomapa,
      {
        id: `ge-${Date.now()}`,
        networkName: ecoCategory,
        category: ecoCategory,
        strength: ecoStrength,
        notes: ecoNotes.trim() || 'Vínculo comunitario evaluado',
      },
    ];
    setEcomapa(next);
    persistAll(nodes, relations, next);
    setEcoNotes('');
    onTriggerToast(`Red del Ecomapa añadida: ${ecoCategory}`);
  };

  const gen1 = nodes.filter((n) => n.generation === 1);
  const gen2 = nodes.filter((n) => n.generation === 2);
  const gen3 = nodes.filter((n) => n.generation === 3);

  const renderGenogramSymbol = (node: GenogramNode, x: number, y: number) => {
    const strokeColor = node.isIndexPatient ? '#0f766e' : '#1e293b';
    const fillColor = node.isIndexPatient ? '#ccfbf1' : '#ffffff';

    return (
      <g key={node.id} transform={`translate(${x}, ${y})`}>
        {node.sex === 'M' ? (
          <>
            <rect
              x={-22}
              y={-22}
              width={44}
              height={44}
              rx={4}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={node.isIndexPatient ? 3.5 : 2}
            />
            {node.isIndexPatient && (
              <rect
                x={-27}
                y={-27}
                width={54}
                height={54}
                rx={6}
                fill="none"
                stroke="#0d9488"
                strokeWidth={1.8}
                strokeDasharray="4 2"
              />
            )}
          </>
        ) : (
          <>
            <circle
              cx={0}
              cy={0}
              r={22}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={node.isIndexPatient ? 3.5 : 2}
            />
            {node.isIndexPatient && (
              <circle
                cx={0}
                cy={0}
                r={27}
                fill="none"
                stroke="#0d9488"
                strokeWidth={1.8}
                strokeDasharray="4 2"
              />
            )}
          </>
        )}

        {/* Deceased X symbol */}
        {node.isDeceased && (
          <g stroke="#e11d48" strokeWidth={2.5}>
            <line x1={-16} y1={-16} x2={16} y2={16} />
            <line x1={16} y1={-16} x2={-16} y2={16} />
          </g>
        )}

        {/* Age inside symbol */}
        <text
          x={0}
          y={4}
          textAnchor="middle"
          className="text-[11px] font-bold fill-slate-900"
        >
          {node.age}
        </text>

        {/* Name & condition below symbol */}
        <text
          x={0}
          y={38}
          textAnchor="middle"
          className="text-[10.5px] font-extrabold fill-slate-800"
        >
          {node.name.slice(0, 18)}
        </text>
        <text
          x={0}
          y={51}
          textAnchor="middle"
          className="text-[9.5px] fill-teal-700 font-semibold"
        >
          {node.chronicCondition.slice(0, 20)}
        </text>
      </g>
    );
  };

  return (
    <div className="space-y-5">
      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-700">
              Instrumento Gráfico de Medicina Familiar (MSP / UNAP)
            </span>
            <h4 className="text-base font-extrabold text-slate-900">
              Familiograma (Genograma de 3 Generaciones) y Ecomapa Comunitario
            </h4>
            <p className="text-xs text-slate-500">
              Simbología clínica estándar: Cuadrado (Masculino), Círculo (Femenino), Doble borde (Paciente Índice), X (Fallecido) y redes de apoyo.
            </p>
          </div>

          {onSaveSummaryToFamilyRecord && (
            <button
              type="button"
              onClick={() => {
                const summary = `Familiograma: ${nodes.length} integrantes (${gen1.length} en 1ra gen, ${gen2.length} en 2da gen, ${gen3.length} en 3ra gen). Vínculos: ${relations
                  .map((r) => `${r.fromName}-${r.toName} (${r.type})`)
                  .join('; ')}. Ecomapa: ${ecomapa
                  .map((e) => `${e.category}: ${e.strength}`)
                  .join(', ')}.`;
                onSaveSummaryToFamilyRecord(summary);
                onTriggerToast(
                  'Síntesis de Familiograma y Ecomapa sincronizada en la Ficha Familiar #03'
                );
              }}
              className="px-3.5 py-2 rounded-xl text-white text-xs font-extrabold flex items-center gap-1.5 shadow-2xs cursor-pointer"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Volcar Síntesis a Ficha Familiar</span>
            </button>
          )}
        </div>

        {/* Interactive Visual SVG Canvas: Left = 3-Gen Genogram, Right = Ecomapa */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* GENOGRAM SVG CANVAS */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 border-b border-slate-100 pb-2">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-teal-700" />
                Lienzo de Familiograma (3 Generaciones)
              </span>
              <span className="text-[11px] text-slate-400">
                {nodes.length} integrantes graficados
              </span>
            </div>

            <svg
              viewBox="0 0 560 320"
              className="w-full h-[290px] bg-slate-50/60 rounded-xl border border-slate-200/70"
            >
              {/* Generation Guide Lines */}
              <line x1={20} y1={60} x2={540} y2={60} stroke="#e2e8f0" strokeDasharray="4 4" />
              <text x={24} y={24} className="text-[10px] font-bold fill-slate-400 uppercase">
                I. Primera Generación (Abuelos / Padres mayores)
              </text>

              <line x1={20} y1={165} x2={540} y2={165} stroke="#e2e8f0" strokeDasharray="4 4" />
              <text x={24} y={125} className="text-[10px] font-bold fill-teal-700 uppercase">
                II. Segunda Generación (Paciente Índice, Pareja y Hermanos)
              </text>

              <line x1={20} y1={265} x2={540} y2={265} stroke="#e2e8f0" strokeDasharray="4 4" />
              <text x={24} y={230} className="text-[10px] font-bold fill-slate-400 uppercase">
                III. Tercera Generación (Hijos / Nietos / Dependientes)
              </text>

              {/* Vertical descent lines between generations */}
              {gen1.length > 0 && gen2.length > 0 && (
                <line x1={280} y1={78} x2={280} y2={140} stroke="#64748b" strokeWidth={1.8} />
              )}
              {gen2.length > 0 && gen3.length > 0 && (
                <line x1={280} y1={182} x2={280} y2={242} stroke="#64748b" strokeWidth={1.8} />
              )}
              {gen2.length >= 2 && (
                <line
                  x1={180}
                  y1={165}
                  x2={380}
                  y2={165}
                  stroke="#0f766e"
                  strokeWidth={2.2}
                />
              )}

              {/* Render Gen 1 nodes */}
              {gen1.map((n, i) => {
                const step = 520 / (gen1.length + 1);
                return renderGenogramSymbol(n, 20 + step * (i + 1), 60);
              })}

              {/* Render Gen 2 nodes */}
              {gen2.map((n, i) => {
                const step = 520 / (gen2.length + 1);
                return renderGenogramSymbol(n, 20 + step * (i + 1), 165);
              })}

              {/* Render Gen 3 nodes */}
              {gen3.map((n, i) => {
                const step = 520 / (gen3.length + 1);
                return renderGenogramSymbol(n, 20 + step * (i + 1), 265);
              })}
            </svg>
          </div>

          {/* ECOMAPA COMUNITARIO SVG CANVAS */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 border-b border-slate-100 pb-2">
              <span className="flex items-center gap-1.5">
                <Network className="w-4 h-4 text-teal-700" />
                Ecomapa Comunitario (Redes de Apoyo Externas)
              </span>
              <span className="text-[11px] text-slate-400">
                {ecomapa.length} sistemas conectados
              </span>
            </div>

            <svg
              viewBox="0 0 560 320"
              className="w-full h-[290px] bg-slate-50/60 rounded-xl border border-slate-200/70"
            >
              {/* Satellite Community Nodes around Central Family Nucleus */}
              {ecomapa.slice(0, 6).map((item, idx, arr) => {
                const angle = (idx / Math.max(1, arr.length)) * Math.PI * 2 - Math.PI / 2;
                const cx = 280 + Math.cos(angle) * 175;
                const cy = 160 + Math.sin(angle) * 105;
                const isStrong = item.strength.startsWith('Fuerte');
                const isStress = item.strength.startsWith('Estresante');
                const lineStroke = isStrong ? '#0d9488' : isStress ? '#e11d48' : '#94a3b8';

                return (
                  <g key={item.id}>
                    <line
                      x1={280}
                      y1={160}
                      x2={cx}
                      y2={cy}
                      stroke={lineStroke}
                      strokeWidth={isStrong ? 3.2 : 2}
                      strokeDasharray={
                        item.strength.startsWith('Débil')
                          ? '5 4'
                          : isStress
                          ? '2 3'
                          : undefined
                      }
                    />
                    <rect
                      x={cx - 72}
                      y={cy - 22}
                      width={144}
                      height={44}
                      rx={12}
                      fill="#ffffff"
                      stroke={lineStroke}
                      strokeWidth={2}
                    />
                    <text
                      x={cx}
                      y={cy - 4}
                      textAnchor="middle"
                      className="text-[10px] font-extrabold fill-slate-800"
                    >
                      {item.category.slice(0, 22)}
                    </text>
                    <text
                      x={cx}
                      y={cy + 11}
                      textAnchor="middle"
                      className="text-[9px] font-semibold fill-slate-500"
                    >
                      {item.strength.split(' ')[0]}
                    </text>
                  </g>
                );
              })}

              {/* Central Family Nucleus Circle */}
              <circle
                cx={280}
                cy={160}
                r={54}
                fill="#0f766e"
                stroke="#99f6e4"
                strokeWidth={4}
              />
              <text
                x={280}
                y={155}
                textAnchor="middle"
                className="text-[11px] font-extrabold fill-white"
              >
                NÚCLEO FAMILIAR
              </text>
              <text
                x={280}
                y={171}
                textAnchor="middle"
                className="text-[10px] font-semibold fill-teal-100"
              >
                {patientName.split(' ').slice(0, 2).join(' ')}
              </text>
            </svg>
          </div>
        </div>

        {/* Interactive Controls to Add Genogram Nodes, Relations, and Ecomapa Networks */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-2">
          {/* Add Genogram Node */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2.5">
            <h5 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-teal-700" />
              1. Añadir Integrante al Familiograma
            </h5>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Nombre y parentesco"
                value={newNodeName}
                onChange={(e) => setNewNodeName(e.target.value)}
                className="col-span-2 px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
              />
              <input
                type="text"
                placeholder="Edad"
                value={newNodeAge}
                onChange={(e) => setNewNodeAge(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
              />
              <select
                value={newNodeSex}
                onChange={(e) => setNewNodeSex(e.target.value as 'F' | 'M')}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
              >
                <option value="F">Círculo (Femenino)</option>
                <option value="M">Cuadrado (Masculino)</option>
              </select>
              <select
                value={newNodeGen}
                onChange={(e) => setNewNodeGen(Number(e.target.value) as 1 | 2 | 3)}
                className="col-span-2 px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
              >
                <option value={1}>I Generación (Abuelos / Padres)</option>
                <option value={2}>II Generación (Paciente / Pareja / Hermanos)</option>
                <option value={3}>III Generación (Hijos / Nietos)</option>
              </select>
              <input
                type="text"
                placeholder="Condición (ej. HTA, DM2, Sano)"
                value={newNodeCond}
                onChange={(e) => setNewNodeCond(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
              />
              <label className="flex items-center gap-1.5 text-xs text-slate-600 px-1">
                <input
                  type="checkbox"
                  checked={newNodeDeceased}
                  onChange={(e) => setNewNodeDeceased(e.target.checked)}
                />
                <span>Fallecido (X)</span>
              </label>
            </div>
            <button
              type="button"
              onClick={handleAddNode}
              className="w-full py-1.5 rounded-lg text-white text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              <Plus className="w-3.5 h-3.5" /> Graficar en Familiograma
            </button>
          </div>

          {/* Add Family Relationship Line */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2.5">
            <h5 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
              <HeartHandshake className="w-3.5 h-3.5 text-teal-700" />
              2. Dinámica Relacional y Uniones
            </h5>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Integrante A"
                value={relFrom}
                onChange={(e) => setRelFrom(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
              />
              <input
                type="text"
                placeholder="Integrante B (ej. Cónyuge, Madre)"
                value={relTo}
                onChange={(e) => setRelTo(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
              />
              <select
                value={relType}
                onChange={(e) => setRelType(e.target.value as GenogramRelation['type'])}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-semibold"
              >
                <option value="Matrimonio legal">Matrimonio legal (Línea continua)</option>
                <option value="Unión libre / Consensual">
                  Unión libre / Consensual (Línea discontinua)
                </option>
                <option value="Separación / Divorcio">Separación / Divorcio ( // )</option>
                <option value="Relación muy estrecha (Apoyo)">
                  Relación muy estrecha (Doble línea)
                </option>
                <option value="Relación conflictiva / Tensión">
                  Relación conflictiva / Tensión (Zig-zag)
                </option>
              </select>
              <button
                type="button"
                onClick={handleAddRelation}
                className="w-full py-1.5 rounded-lg text-white text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                <Plus className="w-3.5 h-3.5" /> Registrar Vínculo
              </button>
            </div>
            <div className="space-y-1 max-h-24 overflow-y-auto pt-1">
              {relations.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between text-[11px] bg-slate-50 px-2 py-1 rounded border border-slate-200"
                >
                  <span className="truncate">
                    <strong>{r.fromName}</strong> ↔ <strong>{r.toName}</strong> ({r.type})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = relations.filter((x) => x.id !== r.id);
                      setRelations(next);
                      persistAll(nodes, next, ecomapa);
                    }}
                    className="text-slate-400 hover:text-rose-600 ml-1"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Add Ecomapa Network */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2.5">
            <h5 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
              <Network className="w-3.5 h-3.5 text-teal-700" />
              3. Red de Apoyo en Ecomapa
            </h5>
            <div className="space-y-2">
              <select
                value={ecoCategory}
                onChange={(e) =>
                  setEcoCategory(e.target.value as EcomapaConnection['category'])
                }
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-semibold"
              >
                <option value="UNAP / Centro de Salud">UNAP / Centro de Salud</option>
                <option value="Familia Extendida">Familia Extendida</option>
                <option value="Iglesia / Comunidad Religiosa">
                  Iglesia / Comunidad Religiosa
                </option>
                <option value="Escuela / Universidad">Escuela / Universidad</option>
                <option value="Trabajo / Seguro ARS">Trabajo / Seguro ARS</option>
                <option value="Junta de Vecinos / Club">Junta de Vecinos / Club</option>
              </select>
              <select
                value={ecoStrength}
                onChange={(e) =>
                  setEcoStrength(e.target.value as EcomapaConnection['strength'])
                }
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
              >
                <option value="Fuerte (Apoyo activo)">Vínculo Fuerte (Apoyo activo)</option>
                <option value="Débil / Ocasional">Vínculo Débil / Ocasional</option>
                <option value="Estresante / Conflicto">Vínculo Estresante / Conflicto</option>
              </select>
              <input
                type="text"
                placeholder="Observación comunitaria..."
                value={ecoNotes}
                onChange={(e) => setEcoNotes(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
              />
              <button
                type="button"
                onClick={handleAddEcomapa}
                className="w-full py-1.5 rounded-lg text-white text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                <Plus className="w-3.5 h-3.5" /> Conectar al Ecomapa
              </button>
            </div>
            <div className="space-y-1 max-h-24 overflow-y-auto pt-1">
              {ecomapa.map((ec) => (
                <div
                  key={ec.id}
                  className="flex items-center justify-between text-[11px] bg-slate-50 px-2 py-1 rounded border border-slate-200"
                >
                  <span className="truncate">
                    <strong>{ec.category}</strong>: {ec.strength}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = ecomapa.filter((x) => x.id !== ec.id);
                      setEcomapa(next);
                      persistAll(nodes, relations, next);
                    }}
                    className="text-slate-400 hover:text-rose-600 ml-1"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
