import { useDashboardData } from '@/hooks/useDashboardData';
import type { Testeintraege } from '@/types/app';
import { LOOKUP_OPTIONS } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TesteintraegeDialog } from '@/components/dialogs/TesteintraegeDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { StatCard } from '@/components/StatCard';
import {
  IconAlertCircle, IconTool, IconRefresh, IconCheck,
  IconPlus, IconPencil, IconTrash, IconCalendar, IconClipboardList,
  IconChevronRight, IconFlag,
} from '@tabler/icons-react';

const APPGROUP_ID = '6aeda6b61ea867c3070a2f81';
const REPAIR_ENDPOINT = '/claude/build/repair';

const STATUS_COLS = [
  { key: 'offen', label: 'Offen', color: 'bg-amber-50 border-amber-200', headerColor: 'bg-amber-100 text-amber-800', badgeClass: 'bg-amber-100 text-amber-700 border-amber-200' },
  { key: 'in_bearbeitung', label: 'In Bearbeitung', color: 'bg-blue-50 border-blue-200', headerColor: 'bg-blue-100 text-blue-800', badgeClass: 'bg-blue-100 text-blue-700 border-blue-200' },
  { key: 'abgeschlossen', label: 'Abgeschlossen', color: 'bg-green-50 border-green-200', headerColor: 'bg-green-100 text-green-800', badgeClass: 'bg-green-100 text-green-700 border-green-200' },
];

const PRIORITY_STYLES: Record<string, { dot: string; label: string }> = {
  niedrig: { dot: 'bg-slate-400', label: 'Niedrig' },
  mittel: { dot: 'bg-orange-400', label: 'Mittel' },
  hoch: { dot: 'bg-red-500', label: 'Hoch' },
};

export default function DashboardOverview() {
  const { testeintraege, loading, error, fetchAll } = useDashboardData();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Testeintraege | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<string | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Testeintraege | null>(null);

  const stats = useMemo(() => {
    const total = testeintraege.length;
    const bestanden = testeintraege.filter(t => t.fields.bestanden).length;
    const offen = testeintraege.filter(t => t.fields.status?.key === 'offen').length;
    const hoch = testeintraege.filter(t => t.fields.prioritaet?.key === 'hoch').length;
    return { total, bestanden, offen, hoch };
  }, [testeintraege]);

  const grouped = useMemo(() => {
    const map: Record<string, Testeintraege[]> = { offen: [], in_bearbeitung: [], abgeschlossen: [] };
    for (const t of testeintraege) {
      const key = t.fields.status?.key ?? 'offen';
      if (!map[key]) map[key] = [];
      map[key].push(t);
    }
    return map;
  }, [testeintraege]);

  const handleCreate = (statusKey?: string) => {
    setEditRecord(null);
    setDefaultStatus(statusKey);
    setDialogOpen(true);
  };

  const handleEdit = (record: Testeintraege) => {
    setEditRecord(record);
    setDefaultStatus(undefined);
    setDialogOpen(true);
  };

  const handleSubmit = async (fields: Testeintraege['fields']) => {
    if (editRecord) {
      await LivingAppsService.updateTesteintraegeEntry(editRecord.record_id, fields);
    } else {
      await LivingAppsService.createTesteintraegeEntry(fields);
    }
    fetchAll();
  };

  const handleMoveStatus = async (record: Testeintraege, newStatusKey: string) => {
    const opt = LOOKUP_OPTIONS['testeintraege']['status'].find(o => o.key === newStatusKey);
    if (!opt) return;
    await LivingAppsService.updateTesteintraegeEntry(record.record_id, { status: opt.key });
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await LivingAppsService.deleteTesteintraegeEntry(deleteTarget.record_id);
    setDeleteTarget(null);
    fetchAll();
  };

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Testeinträge</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Verwalte deine Tests nach Status</p>
        </div>
        <Button onClick={() => handleCreate()} className="shrink-0">
          <IconPlus size={16} className="mr-2 shrink-0" />
          Neuer Eintrag
        </Button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Gesamt"
          value={String(stats.total)}
          description="Testeinträge"
          icon={<IconClipboardList size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Bestanden"
          value={String(stats.bestanden)}
          description={stats.total > 0 ? `${Math.round((stats.bestanden / stats.total) * 100)}%` : '—'}
          icon={<IconCheck size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Offen"
          value={String(stats.offen)}
          description="Noch ausstehend"
          icon={<IconCalendar size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Hohe Priorität"
          value={String(stats.hoch)}
          description="Dringende Tests"
          icon={<IconFlag size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {STATUS_COLS.map((col, colIdx) => {
          const cards = grouped[col.key] ?? [];
          const nextCol = STATUS_COLS[colIdx + 1];
          return (
            <div key={col.key} className={`rounded-2xl border ${col.color} flex flex-col min-h-[300px]`}>
              {/* Column Header */}
              <div className={`flex items-center justify-between px-4 py-3 rounded-t-2xl ${col.headerColor}`}>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{col.label}</span>
                  <span className="text-xs font-medium opacity-70 bg-white/40 rounded-full px-2 py-0.5">{cards.length}</span>
                </div>
                <button
                  onClick={() => handleCreate(col.key)}
                  className="rounded-lg p-1 hover:bg-white/30 transition-colors"
                  title="Eintrag hinzufügen"
                >
                  <IconPlus size={15} className="shrink-0" />
                </button>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-2 p-3 flex-1">
                {cards.length === 0 && (
                  <div className="flex flex-col items-center justify-center flex-1 py-8 gap-2 opacity-40">
                    <IconClipboardList size={28} stroke={1.5} />
                    <span className="text-xs">Kein Eintrag</span>
                  </div>
                )}
                {cards.map(record => {
                  const prio = record.fields.prioritaet?.key;
                  const prioStyle = prio ? PRIORITY_STYLES[prio] : null;
                  return (
                    <div
                      key={record.record_id}
                      className="bg-white rounded-xl border border-white/80 shadow-sm p-3 flex flex-col gap-2 hover:shadow-md transition-shadow"
                    >
                      {/* Title row */}
                      <div className="flex items-start justify-between gap-2 min-w-0">
                        <span className="font-medium text-sm text-foreground truncate min-w-0 leading-snug">
                          {record.fields.titel ?? '(Kein Titel)'}
                        </span>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => handleEdit(record)}
                            className="p-1 rounded hover:bg-muted transition-colors"
                            title="Bearbeiten"
                          >
                            <IconPencil size={13} className="text-muted-foreground shrink-0" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(record)}
                            className="p-1 rounded hover:bg-destructive/10 transition-colors"
                            title="Löschen"
                          >
                            <IconTrash size={13} className="text-destructive shrink-0" />
                          </button>
                        </div>
                      </div>

                      {/* Description */}
                      {record.fields.beschreibung && (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {record.fields.beschreibung}
                        </p>
                      )}

                      {/* Meta row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {prioStyle && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${prioStyle.dot}`} />
                            {prioStyle.label}
                          </span>
                        )}
                        {record.fields.testdatum && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <IconCalendar size={11} className="shrink-0" />
                            {formatDate(record.fields.testdatum)}
                          </span>
                        )}
                        {record.fields.bestanden != null && (
                          <Badge
                            variant="outline"
                            className={`text-xs px-1.5 py-0 ${record.fields.bestanden ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}
                          >
                            {record.fields.bestanden ? 'Bestanden' : 'Nicht bestanden'}
                          </Badge>
                        )}
                      </div>

                      {/* Move to next status */}
                      {nextCol && (
                        <button
                          onClick={() => handleMoveStatus(record, nextCol.key)}
                          className={`mt-1 flex items-center justify-center gap-1 text-xs font-medium py-1 rounded-lg border transition-colors ${col.badgeClass} hover:opacity-80`}
                        >
                          <span>→ {nextCol.label}</span>
                          <IconChevronRight size={12} className="shrink-0" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add button at bottom */}
              <div className="px-3 pb-3">
                <button
                  onClick={() => handleCreate(col.key)}
                  className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground py-2 rounded-xl border border-dashed border-current/30 hover:bg-white/50 transition-colors opacity-60 hover:opacity-100"
                >
                  <IconPlus size={13} className="shrink-0" />
                  Hinzufügen
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dialog */}
      <TesteintraegeDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditRecord(null); }}
        onSubmit={handleSubmit}
        defaultValues={
          editRecord
            ? editRecord.fields
            : defaultStatus
            ? { status: LOOKUP_OPTIONS['testeintraege']['status'].find(o => o.key === defaultStatus) }
            : undefined
        }
        enablePhotoScan={AI_PHOTO_SCAN['Testeintraege']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Testeintraege']}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Eintrag löschen"
        description={`Soll "${deleteTarget?.fields.titel ?? 'dieser Eintrag'}" wirklich gelöscht werden?`}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
      </div>
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          if (content.startsWith('[DONE]')) { setRepairDone(true); setRepairing(false); }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) setRepairFailed(true);
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte laden Sie die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktieren Sie den Support.</p>}
    </div>
  );
}
