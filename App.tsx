import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import Checkbox from 'expo-checkbox';
import { Svg, Circle } from 'react-native-svg';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// ---------- THEME ----------
const THEMES = {
  twilight: {
    bg: '#141b26', panel: '#1c2433', ink: '#eaf2ff', muted: '#9fb0c8',
    accent: '#22d3ee', accent2: '#a78bfa', shadow: 'rgba(0,0,0,0.35)'
  },
  'workout-dark': {
    bg: '#0b1020', panel: '#0f1426', ink: '#e8ecf8', muted: '#9aa3bf',
    accent: '#00d2ff', accent2: '#7c4dff', shadow: 'rgba(0,0,0,0.45)'
  },
  amoled: {
    bg: '#000000', panel: '#0b0b0b', ink: '#e7e7e7', muted: '#9aa3bf',
    accent: '#22c55e', accent2: '#06b6d4', shadow: 'rgba(0,0,0,0.6)'
  },
  sunrise: {
    bg: '#161326', panel: '#1e1a33', ink: '#f6f3ff', muted: '#c7c0e0',
    accent: '#f59e0b', accent2: '#ef4444', shadow: 'rgba(0,0,0,0.4)'
  },
};

const USER = 'ahmad';
const KEY = (k: string) => `wm_${USER}_${k}`;

// ------------ DATA ------------
const lowImpactHIIT = [
  { name: 'Shadow boxing flurries', work: '30s fast, 30s easy × 6–8' },
  { name: 'Low step-ups (alt.)', work: '20s on / 20s off × 8' },
  { name: 'Mountain climbers (elevated)', work: '20s on / 20s off × 8' },
  { name: 'DB swings (hip hinge)', work: '15 reps EMOM × 8 min' },
  { name: 'High-knee marches (fast)', work: '30s on / 30s off × 8' },
];

const EX = (name: string, sets: string, reps: string, notes = '') => ({ name, sets, reps, notes });

function phase1DayTemplate(dayIndex: number) {
  const bundles = [
    [
      EX('Goblet Squat (to box/chair)', '3', '10–12', 'Tempo 3‑1‑2; knee‑friendly depth'),
      EX('DB Floor Press', '3', '10–12', 'Elbows 45°'),
      EX('One‑Arm DB Row', '3', '10–12/side', 'Hold at top 1s'),
      EX('DB Hip Hinge (RDL)', '3', '10–12', 'Hips back, neutral spine'),
      EX('Assisted Split Squat', '2', '8–10/side', 'Light support; slow eccentric'),
    ],
    [
      EX('Step‑Ups (low step)', '3', '8–10/side', 'Control down; knee tracks toes'),
      EX('DB Shoulder Press (seated if needed)', '3', '10–12', ''),
      EX('DB Gorilla Row', '3', '8–10/side', 'Hinge; anti‑rotation'),
      EX('Glute Bridge (weighted optional)', '3', '12–15', 'Squeeze 1s top'),
      EX('Side Plank', '2', '20–30s/side', ''),
    ],
    [
      EX('Box Squat (pause)', '3', '8–10', '1s pause on box'),
      EX('DB Incline Floor Press (hips up)', '3', '8–12', 'Bridge to simulate incline'),
      EX('Rear‑foot Elevated Split Squat (short ROM)', '2', '6–8/side', 'Hold support, partial depth'),
      EX('DB Row to Hip', '3', '10–12/side', ''),
      EX('Dead Bug', '2', '8–10/side', 'Core brace'),
    ],
  ];
  return bundles[dayIndex % 3];
}

const PPL = {
  push: [
    EX('DB Flat Press', '4', '8–12', ''),
    EX('DB Shoulder Press', '3', '8–12', ''),
    EX('DB Incline Push‑Up (feet elevated optional)', '3', 'AMRAP', 'Stop 1–2 reps in tank'),
    EX('DB Lateral Raise', '3', '12–15', ''),
    EX('Overhead Triceps Extension', '3', '10–12', ''),
  ],
  pull: [
    EX('One‑Arm DB Row', '4', '8–12/side', 'Pause 1s top'),
    EX('DB Hip Hinge (RDL)', '3', '8–12', ''),
    EX('Chest‑Supported Row (on bench/boxes)', '3', '10–12', ''),
    EX('DB Hammer Curl', '3', '10–12', ''),
    EX('Face Pulls (band) or Y‑T‑W (bodyweight)', '2', '12–15', ''),
  ],
  legs: [
    EX('Goblet Squat (tempo 3‑1‑2)', '4', '8–12', 'Use box if needed'),
    EX('Split Squat', '3', '8–10/side', 'Hold support if needed'),
    EX('DB Romanian Deadlift', '3', '8–12', ''),
    EX('DB Step‑Ups (low)', '3', '8–10/side', 'Control down'),
    EX('Calf Raises', '3', '12–15', ''),
  ],
};

function hiitFor(day: number) {
  return lowImpactHIIT[day % lowImpactHIIT.length];
}

const WEEKS = Array.from({ length: 12 }, (_, i) => {
  const w = i + 1;
  const phase = w <= 4 ? 1 : w <= 8 ? 2 : 3;
  let split: string[];
  if (phase === 1) {
    split = ['Full Body A', 'Full Body B', 'Full Body C', 'Full Body A', 'Full Body B', 'Recovery Mobility'];
  } else {
    split = ['Push', 'Pull', 'Legs', 'Push', 'Pull', 'Legs'];
  }
  return { week: w, phase, split };
});

const PHASES = [
  { id: 1, label: 'Phase 1 • W1–4' },
  { id: 2, label: 'Phase 2 • W5–8' },
  { id: 3, label: 'Phase 3 • W9–12' },
];

// ---------- HELPERS ----------
function getCheckKey(week: number, day: number, idx: number) {
  return KEY(`w${week}_d${day}_c${idx}`);
}
function getNoteKey(week: number, day: number, idx: number) {
  return KEY(`w${week}_d${day}_n${idx}`);
}

async function storageGet(key: string, fallback: string | null = null): Promise<string | null> {
  try {
    const v = await AsyncStorage.getItem(key);
    return v ?? fallback;
  } catch (e) {
    return fallback;
  }
}
async function storageSet(key: string, value: string) {
  try { await AsyncStorage.setItem(key, value); } catch {}
}

// ---------- COMPONENTS ----------
function Donut({ pct, theme }: { pct: number; theme: typeof THEMES.twilight }) {
  const size = 160;
  const stroke = 16;
  const center = size / 2;
  const radius = center - stroke / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, pct));
  const dash = (progress / 100) * circumference;
  return (
    <View style={{ width: size, height: size, alignSelf: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={center} cy={center} r={radius} stroke={'rgba(255,255,255,0.12)'} strokeWidth={stroke} fill="none" />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={theme.accent}
          strokeWidth={stroke}
          strokeDasharray={`${dash}, ${circumference}`}
          strokeLinecap="round"
          fill="none"
          rotation="-90"
          origin={`${center}, ${center}`}
        />
      </Svg>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: theme.ink, fontSize: 26, fontWeight: '800' }}>{progress}%</Text>
      </View>
    </View>
  );
}

function Chip({ active, label, onPress, theme }: { active: boolean; label: string; onPress: () => void; theme: any }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: active ? '#1a2244' : '#141a33',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,.14)',
      }}
    >
      <Text style={{ color: theme.ink, fontWeight: '700' }}>{label}</Text>
    </TouchableOpacity>
  );
}

function Button({ label, onPress, kind = 'default', theme }: { label: string; onPress: () => void; kind?: 'default' | 'ok' | 'warn' | 'danger'; theme: any }) {
  const border = kind === 'ok' ? 'rgba(34,197,94,.45)'
    : kind === 'warn' ? 'rgba(245,158,11,.45)'
    : kind === 'danger' ? 'rgba(239,68,68,.45)'
    : 'rgba(255,255,255,.14)';
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ backgroundColor: '#141a33', borderWidth: 1, borderColor: border, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10 }}
    >
      <Text style={{ color: theme.ink, fontWeight: '700' }}>{label}</Text>
    </TouchableOpacity>
  );
}

function ExerciseRow({ week, day, idx, ex, theme, onToggle }: {
  week: number; day: number; idx: number; ex: { name: string; sets: string; reps: string; notes?: string };
  theme: any; onToggle: () => void;
}) {
  const [checked, setChecked] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    storageGet(getCheckKey(week, day, idx), '0').then((v) => setChecked(v === '1'));
    storageGet(getNoteKey(week, day, idx), '').then((v) => setNote(v || ''));
  }, [week, day, idx]);

  const howtoUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(ex.name + ' dumbbell proper form')}`;

  return (
    <View style={{ borderWidth: 1, borderColor: 'rgba(255,255,255,.08)', borderStyle: 'dashed', borderRadius: 10, padding: 8, marginVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Checkbox
        value={checked}
        onValueChange={async (v) => {
          setChecked(v);
          await storageSet(getCheckKey(week, day, idx), v ? '1' : '0');
          onToggle();
        }}
        color={checked ? theme.accent : undefined}
      />
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.ink, fontWeight: '700' }}>{ex.name}</Text>
        <Text style={{ color: theme.muted, fontSize: 12 }}>
          Sets: {ex.sets} • Reps: {ex.reps} {ex.notes ? `• ${ex.notes}` : ''} •
          <Text style={{ color: theme.bg }}> </Text>
          <Text style={{ color: theme.ink }} onPress={() => {
            // open in web browser
            if (Platform.OS === 'web') {
              window.open(howtoUrl, '_blank');
            } else {
              // Best-effort: use Linking
              import('react-native').then(({ Linking }) => Linking.openURL(howtoUrl));
            }
          }}>How‑to ▶</Text>
        </Text>
        <TextInput
          placeholder="Weight/Reps/RPE notes…"
          placeholderTextColor={theme.muted}
          value={note}
          onChangeText={async (t) => { setNote(t); await storageSet(getNoteKey(week, day, idx), t); }}
          style={{ color: theme.ink, borderWidth: 1, borderColor: 'rgba(255,255,255,.12)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginTop: 6 }}
        />
      </View>
    </View>
  );
}

function Card({ title, children, theme }: { title: string; children: React.ReactNode; theme: any }) {
  return (
    <View style={{ backgroundColor: theme.panel, borderColor: 'rgba(255,255,255,.12)', borderWidth: 1, borderRadius: 18, overflow: 'hidden', marginBottom: 14 }}>
      <View style={{ padding: 12, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,.08)', backgroundColor: 'rgba(14,165,233,0.35)' }}>
        <Text style={{ color: theme.ink, fontWeight: '700' }}>{title}</Text>
      </View>
      <View style={{ padding: 12 }}>
        {children}
      </View>
    </View>
  );
}

export default function App() {
  const colorScheme = useColorScheme();
  const [themeName, setThemeName] = useState<string>('twilight');
  const theme = THEMES[themeName as keyof typeof THEMES] ?? THEMES.twilight;

  const [activePhase, setActivePhase] = useState<number>(1);
  const [startWeek, setStartWeek] = useState<number>(1);
  const [query, setQuery] = useState<string>('');
  const [totals, setTotals] = useState({ total: 0, done: 0, pct: 0 });

  useEffect(() => { storageGet(KEY('theme'), 'twilight').then((v) => setThemeName(v || 'twilight')); }, []);
  useEffect(() => { storageSet(KEY('theme'), themeName); }, [themeName]);

  useEffect(() => { storageGet(KEY('phase'), '1').then((v) => setActivePhase(parseInt(v || '1') || 1)); }, []);
  useEffect(() => { storageSet(KEY('phase'), String(activePhase)); }, [activePhase]);

  useEffect(() => { storageGet(KEY('startWeek'), '1').then((v) => setStartWeek(parseInt(v || '1') || 1)); }, []);
  useEffect(() => { storageSet(KEY('startWeek'), String(startWeek)); }, [startWeek]);

  useEffect(() => { storageGet(KEY('q'), '').then((v) => setQuery(v || '')); }, []);
  useEffect(() => { storageSet(KEY('q'), query); }, [query]);

  // Compute totals by scanning keys in storage. On native, there's no DOM; derive from storage keys.
  const refreshTotals = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const myKeys = keys.filter((k) => k.startsWith(`wm_${USER}_w`)).filter((k) => k.includes('_c'));
      const values = await AsyncStorage.multiGet(myKeys);
      const total = myKeys.length;
      const done = values.reduce((acc, [, v]) => acc + (v === '1' ? 1 : 0), 0);
      const pct = total ? Math.round((done / total) * 100) : 0;
      setTotals({ total, done, pct });
    } catch {
      setTotals({ total: 0, done: 0, pct: 0 });
    }
  };
  useEffect(() => { refreshTotals(); }, [activePhase, startWeek, query, themeName]);

  const filteredWeeks = useMemo(() => WEEKS.filter((w) => w.phase === activePhase), [activePhase]);

  const exportProgress = async () => {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const data: Record<string, string | null> = {};
      for (const k of allKeys) {
        if (k.startsWith(`wm_${USER}_`)) {
          data[k] = await AsyncStorage.getItem(k);
        }
      }
      const json = JSON.stringify(data, null, 2);
      if (Platform.OS === 'web') {
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'ahmad_workout_progress.json';
        a.click(); URL.revokeObjectURL(url);
      } else {
        const file = FileSystem.cacheDirectory + 'ahmad_workout_progress.json';
        await FileSystem.writeAsStringAsync(file, json);
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(file);
        }
      }
    } catch {}
  };

  const resetAll = async () => {
    const keys = await AsyncStorage.getAllKeys();
    for (const k of keys) {
      if (k.startsWith(`wm_${USER}_`)) await AsyncStorage.removeItem(k);
    }
    await refreshTotals();
  };

  const resetWeek = async (week: number) => {
    const keys = await AsyncStorage.getAllKeys();
    for (const k of keys) {
      if (k.startsWith(KEY(`w${week}_`))) await AsyncStorage.removeItem(k);
    }
    await refreshTotals();
  };

  const renderDay = (w: number, label: string, dayIndex: number) => {
    const day = dayIndex + 1;
    const hiit = hiitFor(day);
    let exs: ReturnType<typeof EX>[] = [] as any;
    if (label === 'Recovery Mobility' && w <= 4) {
      exs = [
        EX('Knee Isometrics (wall sit)', '3', '20–30s', 'Stop if pain; easy angle'),
        EX('Hip Airplanes or Supported Single‑Leg RDL', '2', '6–8/side', 'Balance & control'),
        EX('Cat‑Camel + Thoracic Opener', '2', '6–8 slow', ''),
        EX('Calf Pumps on Wall', '2', '20–30s', ''),
      ];
    } else if (w <= 4) {
      exs = phase1DayTemplate(dayIndex);
    } else {
      const map: any = { Push: PPL.push, Pull: PPL.pull, Legs: PPL.legs };
      exs = map[label] || [];
    }

    const warmup = 'Warm‑up: 2 rounds — 30s march, 10 air squats to box, 10 arm circles, 10 hip hinges, 20s calf pumps, 20s glute bridges.';

    const searchableText = (label + ' ' + exs.map((e) => e.name).join(' ') + ' week ' + w).toLowerCase();
    if (query && !searchableText.includes(query.toLowerCase())) return null;

    return (
      <Card key={`w${w}d${day}`} title={`W${w}D${day} • ${label}`} theme={theme}>
        <Text style={{ color: theme.muted, marginBottom: 6 }}>{warmup}</Text>
        <View>
          {exs.map((ex, idx) => (
            <ExerciseRow key={idx} week={w} day={day} idx={idx} ex={ex} theme={theme} onToggle={refreshTotals} />
          ))}
        </View>
        <View style={{ borderLeftWidth: 4, borderLeftColor: '#f59e0b', paddingLeft: 10, marginTop: 8 }}>
          <Text style={{ color: theme.ink, fontWeight: '700' }}>HIIT Finisher:</Text>
          <Text style={{ color: theme.ink }}>{hiit.name} — <Text style={{ fontStyle: 'italic' }}>{hiit.work}</Text></Text>
        </View>
        <View style={{ borderLeftWidth: 4, borderLeftColor: theme.accent2, paddingLeft: 10, marginTop: 8 }}>
          <Text style={{ color: theme.ink, fontWeight: '700' }}>Cooldown:</Text>
          <Text style={{ color: theme.ink }}>nasal breathing 2–3 min • quad & calf stretch • thoracic opener</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
          <Button label="Mark Day Complete" kind="ok" theme={theme} onPress={async () => {
            // mark all checkboxes for this day
            const keys: string[] = [];
            for (let i = 0; i < 12; i++) { // safe upper bound per day
              keys.push(getCheckKey(w, day, i));
            }
            await AsyncStorage.multiSet(keys.map((k) => [k, '1'] as [string, string]));
            await refreshTotals();
          }} />
          <Button label="Unmark Day" theme={theme} onPress={async () => {
            const keys: string[] = [];
            for (let i = 0; i < 12; i++) { keys.push(getCheckKey(w, day, i)); }
            await AsyncStorage.multiSet(keys.map((k) => [k, '0'] as [string, string]));
            await refreshTotals();
          }} />
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'light-content'} />
      <ScrollView contentContainerStyle={{ padding: 12 }}>
        {/* Header */}
        <View style={{ paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,.08)' }}>
          <View style={{ gap: 6 }}>
            <Text style={{ color: '#0f1220', fontWeight: '800', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: theme.accent }}>{"Ahmad’s 12‑Week Home Program"}</Text>
            <Text style={{ color: theme.ink, fontSize: 22, fontWeight: '800' }}>Lean Machine: Dumbbells + Bodyweight, 6‑Day Rhythm</Text>
            <Text style={{ color: theme.muted }}>Objective: fat loss, fitness, lean muscle • 40–50 mins/session • HIIT included • Knee‑friendly progression</Text>
          </View>
          <View style={{ marginTop: 10, gap: 10 }}>
            <View style={{ backgroundColor: theme.panel, borderWidth: 1, borderColor: 'rgba(255,255,255,.08)', borderRadius: 12, padding: 10 }}>
              <Text style={{ color: theme.muted, marginBottom: 6 }}>Quick find</Text>
              <TextInput
                placeholder="Search exercise / day / note…"
                placeholderTextColor={theme.muted}
                value={query}
                onChangeText={setQuery}
                style={{ color: theme.ink, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,.12)' }}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <View style={{ backgroundColor: theme.panel, borderWidth: 1, borderColor: 'rgba(255,255,255,.08)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 }}>
                <Text style={{ color: theme.muted }}>Start week</Text>
                <Picker
                  selectedValue={startWeek}
                  onValueChange={(v) => setStartWeek(v)}
                  dropdownIconColor={theme.ink}
                  style={{ color: theme.ink, width: 200 }}
                >
                  {WEEKS.map((w) => (
                    <Picker.Item key={w.week} label={`Start at Week ${w.week}`} value={w.week} />
                  ))}
                </Picker>
              </View>

              <Button label="Export Progress (JSON)" kind="warn" theme={theme} onPress={exportProgress} />
              <Button label="Reset All" kind="danger" theme={theme} onPress={resetAll} />
            </View>

            <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <View style={{ backgroundColor: theme.panel, borderWidth: 1, borderColor: 'rgba(255,255,255,.10)', borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center' }}>
                <Donut pct={totals.pct} theme={theme} />
                <View style={{ marginLeft: 12 }}>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ backgroundColor: '#141a33', borderWidth: 1, borderColor: 'rgba(255,255,255,.08)', borderStyle: 'dashed', borderRadius: 14, padding: 10 }}>
                      <Text style={{ color: theme.ink, fontSize: 22, fontWeight: '800' }}>{totals.done}</Text>
                      <Text style={{ color: theme.muted, marginTop: 6 }}>Tasks Done</Text>
                    </View>
                    <View style={{ backgroundColor: '#141a33', borderWidth: 1, borderColor: 'rgba(255,255,255,.08)', borderStyle: 'dashed', borderRadius: 14, padding: 10 }}>
                      <Text style={{ color: theme.ink, fontSize: 22, fontWeight: '800' }}>{totals.total}</Text>
                      <Text style={{ color: theme.muted, marginTop: 6 }}>Total Tasks</Text>
                    </View>
                  </View>
                  <Text style={{ color: theme.muted, marginTop: 8, maxWidth: 280 }}>
                    Global completion updates live as you tick exercises. Your data auto‑saves on device. Export anytime.
                  </Text>
                </View>
              </View>
            </View>

            <View style={{ backgroundColor: theme.panel, borderWidth: 1, borderColor: 'rgba(255,255,255,.10)', borderRadius: 18, padding: 16 }}>
              <Text style={{ color: theme.ink, fontWeight: '700', marginBottom: 8 }}>Phases</Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {PHASES.map((p) => (
                  <Chip key={p.id} label={p.label} active={activePhase === p.id} onPress={() => setActivePhase(p.id)} theme={theme} />
                ))}
              </View>
              <Text style={{ color: theme.muted, marginTop: 8 }}>
                • <Text style={{ fontWeight: '700', color: theme.ink }}>Phase 1 (W1–4)</Text> Full‑Body + Conditioning + Knee Primer{'
'}
                • <Text style={{ fontWeight: '700', color: theme.ink }}>Phase 2 (W5–8)</Text> PPL Hypertrophy (build shape){'
'}
                • <Text style={{ fontWeight: '700', color: theme.ink }}>Phase 3 (W9–12)</Text> PPL + Athletic Conditioning
              </Text>
            </View>

            <View style={{ backgroundColor: theme.panel, borderWidth: 1, borderColor: 'rgba(255,255,255,.12)', borderRadius: 18, padding: 16 }}>
              <Text style={{ color: theme.ink, fontWeight: '700' }}>Warm‑up → Cooldown</Text>
              <Text style={{ color: theme.muted, marginTop: 6 }}>
                Warm‑up (6–8 min): 2 rounds — 30s march-in-place, 10 air squats to box/chair (slow), 10 arm circles each, 10 hip hinges, 20s calf pumps, 20s glute bridges.{'\n'}
                Knee‑Primer: 2×10 slow split‑squat isometric holds (bottom 2s), 2×10 step‑ups to low step (control).{'\n'}
                Cooldown (3–5 min): slow nasal breathing, quad stretch, calf stretch on wall, thoracic openers.
              </Text>
              <Text style={{ color: theme.ink, marginTop: 8, fontWeight: '700' }}>Progression & RPE</Text>
              <Text style={{ color: theme.muted, marginTop: 6 }}>
                Use RPE 7–9 (2–3 reps left in tank). If you finish a set with ease, add 1–2 kg (or reps) next time. For unilateral moves, log both sides.
              </Text>
              <Text style={{ color: theme.ink, marginTop: 8, fontWeight: '700' }}>Knee‑Friendly HIIT</Text>
              <Text style={{ color: theme.muted, marginTop: 6 }}>
                Choose low‑impact options: shadow boxing combos, fast step‑ups to low box, high‑knee marches, KB/Dumbbell swings (hip hinge), mountain climbers (hands on bench), rope‑less skips.
              </Text>
            </View>
          </View>
        </View>

        {/* Weeks */}
        <View style={{ marginTop: 16 }}>
          {filteredWeeks.map((w) => (
            <View key={w.week}>
              <Card title={`Week ${w.week} ${w.phase === 1 ? '• Phase 1: Full Body' : w.phase === 2 ? '• Phase 2: PPL' : '• Phase 3: PPL + Conditioning'}`} theme={theme}>
                <Text style={{ color: theme.muted }}>Split: {w.split.join(' • ')}</Text>
                <View style={{ marginTop: 10 }}>
                  <Button label="Reset Week" kind="warn" theme={theme} onPress={() => resetWeek(w.week)} />
                </View>
              </Card>
              {w.split.map((label, dIdx) => renderDay(w.week, label, dIdx))}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
