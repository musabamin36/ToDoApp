import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Trash2, Pencil, X, CalendarDays, AlertTriangle, Inbox, Check } from 'lucide-react';

/* ============================================================================
   UTILITIES
   ========================================================================= */

const pad = (n) => String(n).padStart(2, '0');
const toISODate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const addDays = (date, days) => { const d = new Date(date); d.setDate(d.getDate() + days); return d; };

const TODAY_ISO = toISODate(startOfToday());
const TOMORROW_ISO = toISODate(addDays(startOfToday(), 1));
const THIS_YEAR = startOfToday().getFullYear();

/** Human-friendly label for a due date, e.g. "Today", "Tomorrow", "Fri, Mar 14". */
function formatDueDate(iso) {
  if (iso === TODAY_ISO) return 'Today';
  if (iso === TOMORROW_ISO) return 'Tomorrow';
  const d = new Date(`${iso}T00:00:00`);
  const opts = { weekday: 'short', month: 'short', day: 'numeric' };
  if (d.getFullYear() !== THIS_YEAR) opts.year = 'numeric';
  return d.toLocaleDateString(undefined, opts);
}

const isOverdue = (task) => !task.completed && task.dueDate < TODAY_ISO;

let idSeed = 0;
/** Generates a unique id for a task, combining a timestamp with an in-session counter. */
const genId = () => `task-${Date.now()}-${idSeed++}`;

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

const EMPTY_COPY = {
  today: { title: "Nothing on deck for today.", sub: 'Add a task above to get moving.' },
  tomorrow: { title: 'Tomorrow is wide open.', sub: 'Plan ahead by adding a task for it.' },
  upcoming: { title: 'No upcoming tasks.', sub: 'Pick a specific date to schedule one.' },
};

const STORAGE_KEY = 'todo-app.tasks.v1';

/* ============================================================================
   SEED DATA — used only the very first time (no saved tasks yet)
   ========================================================================= */

function buildSeedTasks() {
  return [
    {
      id: genId(),
      title: 'Reply to design review comments',
      description: 'Focus on the onboarding flow thread.',
      priority: 'high',
      dueDate: TODAY_ISO,
      completed: false,
      createdAt: Date.now() - 5000,
    },
    {
      id: genId(),
      title: 'Water the plants',
      description: '',
      priority: 'low',
      dueDate: TODAY_ISO,
      completed: true,
      createdAt: Date.now() - 4000,
    },
    {
      id: genId(),
      title: 'Prep slides for the team sync',
      description: 'Keep it to five slides max.',
      priority: 'medium',
      dueDate: TOMORROW_ISO,
      completed: false,
      createdAt: Date.now() - 3000,
    },
    {
      id: genId(),
      title: 'Renew passport',
      description: 'Check the appointment slots first.',
      priority: 'medium',
      dueDate: toISODate(addDays(startOfToday(), 9)),
      completed: false,
      createdAt: Date.now() - 2000,
    },
    {
      id: genId(),
      title: 'Send invoice to the printer',
      description: '',
      priority: 'high',
      dueDate: toISODate(addDays(startOfToday(), -2)),
      completed: false,
      createdAt: Date.now() - 1000,
    },
  ];
}

function loadInitialTasks() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Could not read saved tasks, starting fresh.', e);
  }
  return buildSeedTasks();
}

/* ============================================================================
   PrioritySelector — visual button group for choosing low / medium / high
   ========================================================================= */

/**
 * @param {{
 *   value: 'low'|'medium'|'high',
 *   onChange: (priority: 'low'|'medium'|'high') => void,
 *   idPrefix?: string
 * }} props
 */
function PrioritySelector({ value, onChange, idPrefix = 'priority' }) {
  const options = [
    { key: 'low', label: 'Low' },
    { key: 'medium', label: 'Medium' },
    { key: 'high', label: 'High' },
  ];
  return (
    <div className="priority-group" role="radiogroup" aria-label="Priority">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          id={`${idPrefix}-${opt.key}`}
          role="radio"
          aria-checked={value === opt.key}
          className={`priority-btn priority-${opt.key}${value === opt.key ? ' is-active' : ''}`}
          onClick={() => onChange(opt.key)}
        >
          <span className="priority-dot" aria-hidden="true" />
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/* ============================================================================
   TaskInput — form for adding a new task, or (via editingTask) editing one
   ========================================================================= */

/**
 * @param {{
 *   onSubmit: (task: object) => void,
 *   editingTask?: object|null,
 *   onCancelEdit?: () => void
 * }} props
 */
function TaskInput({ onSubmit, editingTask = null, onCancelEdit }) {
  const isEditing = !!editingTask;
  const [title, setTitle] = useState(editingTask?.title ?? '');
  const [description, setDescription] = useState(editingTask?.description ?? '');
  const [priority, setPriority] = useState(editingTask?.priority ?? 'medium');
  const [dueDate, setDueDate] = useState(editingTask?.dueDate ?? TODAY_ISO);
  const [error, setError] = useState('');
  const titleRef = useRef(null);

  useEffect(() => {
    setTitle(editingTask?.title ?? '');
    setDescription(editingTask?.description ?? '');
    setPriority(editingTask?.priority ?? 'medium');
    setDueDate(editingTask?.dueDate ?? TODAY_ISO);
    setError('');
    if (isEditing) titleRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingTask]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Give the task a title.');
      titleRef.current?.focus();
      return;
    }
    onSubmit({
      id: editingTask?.id ?? genId(),
      title: title.trim(),
      description: description.trim(),
      priority,
      dueDate,
      completed: editingTask?.completed ?? false,
      createdAt: editingTask?.createdAt ?? Date.now(),
    });
    if (!isEditing) {
      setTitle('');
      setDescription('');
      setPriority('medium');
      setDueDate(TODAY_ISO);
      titleRef.current?.focus();
    }
  };

  const titleId = isEditing ? 'edit-title' : 'new-title';
  const descId = isEditing ? 'edit-desc' : 'new-desc';
  const dateId = isEditing ? 'edit-date' : 'new-date';

  return (
    <form className="task-form" onSubmit={handleSubmit} noValidate>
      <div className="field">
        <label htmlFor={titleId} className="sr-only">Task title</label>
        <input
          id={titleId}
          ref={titleRef}
          type="text"
          placeholder="Add a task…"
          value={title}
          onChange={(e) => { setTitle(e.target.value); if (error) setError(''); }}
          className={`title-input${error ? ' has-error' : ''}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${titleId}-error` : undefined}
        />
        <button type="submit" className="submit-btn" aria-label={isEditing ? 'Save changes' : 'Add task'}>
          {isEditing ? <Check size={18} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}
          <span>{isEditing ? 'Save' : 'Add'}</span>
        </button>
      </div>
      {error && <p id={`${titleId}-error`} className="field-error" role="alert">{error}</p>}

      <div className="field">
        <label htmlFor={descId} className="sr-only">Description (optional)</label>
        <textarea
          id={descId}
          placeholder="Add a note (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="desc-input"
          rows={1}
        />
      </div>

      <div className="field-row">
        <PrioritySelector value={priority} onChange={setPriority} idPrefix={isEditing ? 'edit-priority' : 'new-priority'} />

        <div className="date-group">
          <button
            type="button"
            className={`chip${dueDate === TODAY_ISO ? ' is-active' : ''}`}
            onClick={() => setDueDate(TODAY_ISO)}
            aria-pressed={dueDate === TODAY_ISO}
          >
            Today
          </button>
          <button
            type="button"
            className={`chip${dueDate === TOMORROW_ISO ? ' is-active' : ''}`}
            onClick={() => setDueDate(TOMORROW_ISO)}
            aria-pressed={dueDate === TOMORROW_ISO}
          >
            Tomorrow
          </button>
          <label className={`chip date-chip${dueDate !== TODAY_ISO && dueDate !== TOMORROW_ISO ? ' is-active' : ''}`}>
            <CalendarDays size={14} aria-hidden="true" />
            <span className="sr-only" id={`${dateId}-label`}>Custom due date</span>
            <input
              type="date"
              aria-labelledby={`${dateId}-label`}
              value={dueDate}
              onChange={(e) => e.target.value && setDueDate(e.target.value)}
              className="date-input"
            />
          </label>
        </div>
      </div>

      {isEditing && (
        <button type="button" className="text-btn" onClick={onCancelEdit}>
          Cancel
        </button>
      )}
    </form>
  );
}

/* ============================================================================
   TabNavigation — Today | Tomorrow | Upcoming
   ========================================================================= */

/**
 * @param {{
 *   tabs: {key: string, label: string}[],
 *   activeTab: string,
 *   onChange: (key: string) => void,
 *   counts: Record<string, number>
 * }} props
 */
function TabNavigation({ tabs, activeTab, onChange, counts }) {
  const onKeyDown = (e, index) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const dir = e.key === 'ArrowRight' ? 1 : -1;
    const next = tabs[(index + dir + tabs.length) % tabs.length];
    onChange(next.key);
    document.getElementById(`tab-${next.key}`)?.focus();
  };

  return (
    <div className="tabs" role="tablist" aria-label="Task timeframe">
      {tabs.map((tab, i) => (
        <button
          key={tab.key}
          id={`tab-${tab.key}`}
          role="tab"
          aria-selected={activeTab === tab.key}
          aria-controls={`panel-${tab.key}`}
          tabIndex={activeTab === tab.key ? 0 : -1}
          className={`tab-btn${activeTab === tab.key ? ' is-active' : ''}`}
          onClick={() => onChange(tab.key)}
          onKeyDown={(e) => onKeyDown(e, i)}
        >
          {tab.label}
          {counts[tab.key] > 0 && <span className="tab-count">{counts[tab.key]}</span>}
        </button>
      ))}
    </div>
  );
}

/* ============================================================================
   TaskItem — single row: checkbox, title, priority badge, date, actions
   ========================================================================= */

/**
 * @param {{
 *   task: object,
 *   onToggle: (id: string) => void,
 *   onDelete: (id: string) => void,
 *   onEdit: (task: object) => void
 * }} props
 */
function TaskItem({ task, onToggle, onDelete, onEdit }) {
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);
  const overdue = isOverdue(task);

  const confirmDelete = () => {
    setRemoving(true);
    window.setTimeout(() => onDelete(task.id), 170);
  };

  return (
    <li className={`task-item${task.completed ? ' is-completed' : ''}${overdue ? ' is-overdue' : ''}${removing ? ' is-removing' : ''}`}>
      <button
        type="button"
        className="task-checkbox"
        role="checkbox"
        aria-checked={task.completed}
        aria-label={task.completed ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`}
        onClick={() => onToggle(task.id)}
      >
        <svg viewBox="0 0 24 24" className="check-icon" aria-hidden="true">
          <circle cx="12" cy="12" r="10" className="check-ring" />
          <path d="M7 12.5l3.2 3.2L17 9" className="check-mark" />
        </svg>
      </button>

      <div className="task-body">
        <div className="task-title-row">
          <span className="task-title">{task.title}</span>
          <span className={`priority-badge priority-${task.priority}`}>
            <span className="priority-dot" aria-hidden="true" />
            {task.priority}
          </span>
        </div>

        {task.description && <p className="task-description">{task.description}</p>}

        <div className="task-meta">
          <span className="task-date">
            <CalendarDays size={13} aria-hidden="true" />
            {formatDueDate(task.dueDate)}
          </span>
          {overdue && (
            <span className="overdue-badge">
              <AlertTriangle size={13} aria-hidden="true" />
              Overdue
            </span>
          )}
        </div>
      </div>

      <div className="task-actions">
        {confirming ? (
          <span className="confirm-row">
            <span className="confirm-label">Delete?</span>
            <button type="button" className="icon-btn danger" aria-label={`Confirm delete "${task.title}"`} onClick={confirmDelete}>
              <Check size={16} aria-hidden="true" />
            </button>
            <button type="button" className="icon-btn" aria-label="Cancel delete" onClick={() => setConfirming(false)}>
              <X size={16} aria-hidden="true" />
            </button>
          </span>
        ) : (
          <>
            <button type="button" className="icon-btn" aria-label={`Edit "${task.title}"`} onClick={() => onEdit(task)}>
              <Pencil size={16} aria-hidden="true" />
            </button>
            <button type="button" className="icon-btn danger" aria-label={`Delete "${task.title}"`} onClick={() => setConfirming(true)}>
              <Trash2 size={16} aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </li>
  );
}

/* ============================================================================
   TaskList — filtered list rendering for the active tab
   ========================================================================= */

/**
 * @param {{
 *   tasks: object[],
 *   tabKey: string,
 *   onToggle: (id: string) => void,
 *   onDelete: (id: string) => void,
 *   onEdit: (task: object) => void
 * }} props
 */
function TaskList({ tasks, tabKey, onToggle, onDelete, onEdit }) {
  if (tasks.length === 0) {
    const copy = EMPTY_COPY[tabKey];
    return (
      <div className="empty-state" id={`panel-${tabKey}`} role="tabpanel" aria-labelledby={`tab-${tabKey}`}>
        <Inbox size={30} aria-hidden="true" className="empty-icon" />
        <p className="empty-title">{copy.title}</p>
        <p className="empty-sub">{copy.sub}</p>
      </div>
    );
  }
  return (
    <ul className="task-list" id={`panel-${tabKey}`} role="tabpanel" aria-labelledby={`tab-${tabKey}`}>
      {tasks.map((task) => (
        <TaskItem key={task.id} task={task} onToggle={onToggle} onDelete={onDelete} onEdit={onEdit} />
      ))}
    </ul>
  );
}

/* ============================================================================
   App — main container, owns all state
   ========================================================================= */

export default function App() {
  const [tasks, setTasks] = useState(loadInitialTasks);
  const [activeTab, setActiveTab] = useState('today');
  const [editingTask, setEditingTask] = useState(null);

  // Persist to localStorage on every change.
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (e) {
      console.warn('Could not save tasks.', e);
    }
  }, [tasks]);

  const upsertTask = (task) => {
    setTasks((prev) => {
      const exists = prev.some((t) => t.id === task.id);
      return exists ? prev.map((t) => (t.id === task.id ? task : t)) : [task, ...prev];
    });
    setEditingTask(null);
  };

  const toggleTask = (id) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));

  const deleteTask = (id) => setTasks((prev) => prev.filter((t) => t.id !== id));

  const buckets = useMemo(() => {
    const sortActive = (a, b) =>
      Number(a.completed) - Number(b.completed) ||
      PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
      a.createdAt - b.createdAt;

    const sortUpcoming = (a, b) =>
      Number(a.completed) - Number(b.completed) ||
      a.dueDate.localeCompare(b.dueDate) ||
      PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];

    return {
      today: tasks.filter((t) => t.dueDate === TODAY_ISO).sort(sortActive),
      tomorrow: tasks.filter((t) => t.dueDate === TOMORROW_ISO).sort(sortActive),
      upcoming: tasks.filter((t) => t.dueDate !== TODAY_ISO && t.dueDate !== TOMORROW_ISO).sort(sortUpcoming),
    };
  }, [tasks]);

  const tabs = [
    { key: 'today', label: 'Today' },
    { key: 'tomorrow', label: 'Tomorrow' },
    { key: 'upcoming', label: 'Upcoming' },
  ];

  const counts = {
    today: buckets.today.filter((t) => !t.completed).length,
    tomorrow: buckets.tomorrow.filter((t) => !t.completed).length,
    upcoming: buckets.upcoming.filter((t) => !t.completed).length,
  };

  return (
    <div className="todo-app">
      <style>{CSS}</style>

      <header className="app-header">
        <span className="app-eyebrow">Task list</span>
        <h1 className="app-title">What's on today?</h1>
      </header>

      <div className="input-dock">
        <TaskInput onSubmit={upsertTask} />
      </div>

      <TabNavigation tabs={tabs} activeTab={activeTab} onChange={setActiveTab} counts={counts} />

      <div className="list-scroll">
        <TaskList
          key={activeTab}
          tasks={buckets[activeTab]}
          tabKey={activeTab}
          onToggle={toggleTask}
          onDelete={deleteTask}
          onEdit={setEditingTask}
        />
      </div>

      {editingTask && (
        <div className="modal-overlay" onClick={() => setEditingTask(null)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-heading"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 id="edit-heading">Edit task</h2>
              <button type="button" className="icon-btn" aria-label="Close" onClick={() => setEditingTask(null)}>
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <TaskInput editingTask={editingTask} onSubmit={upsertTask} onCancelEdit={() => setEditingTask(null)} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   STYLES
   Token system:
     bg #FAF8F3 · surface #FFFFFF · border #E6E1D6 · ink #2A2723 · muted #8C8578
     accent (ink-teal) #3B5563 · low #6E9B7C · medium #C99A44 · high #BD5B54
   Display face: Fraunces (headings, tab labels) · Body/UI: Inter
   Signature: hand-drawn tick checkbox that draws itself in on completion
   ========================================================================= */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap');

.todo-app {
  --bg: #FAF8F3;
  --surface: #FFFFFF;
  --border: #E6E1D6;
  --ink: #2A2723;
  --muted: #8C8578;
  --accent: #3B5563;
  --accent-ink: #2C424E;
  --low: #6E9B7C;
  --low-bg: #EAF1EC;
  --medium: #B3822F;
  --medium-bg: #F7EDDA;
  --high: #B14E48;
  --high-bg: #F6E4E2;
  --radius: 14px;
  --radius-sm: 9px;

  box-sizing: border-box;
  max-width: 640px;
  margin: 0 auto;
  background: var(--bg);
  color: var(--ink);
  font-family: 'Inter', system-ui, sans-serif;
  border-radius: 20px;
  border: 1px solid var(--border);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: min(760px, 92vh);
  box-shadow: 0 1px 2px rgba(42,39,35,0.04), 0 12px 32px -16px rgba(42,39,35,0.18);
}
.todo-app *, .todo-app *::before, .todo-app *::after { box-sizing: border-box; }

.todo-app .sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;
}

.todo-app :focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: 6px;
}

/* ---------- Header ---------- */
.app-header {
  padding: 22px 24px 4px;
  flex: none;
}
.app-eyebrow {
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
  font-weight: 600;
}
.app-title {
  font-family: 'Fraunces', serif;
  font-weight: 600;
  font-size: 26px;
  margin: 4px 0 0;
  letter-spacing: -0.01em;
}

/* ---------- Input dock ---------- */
.input-dock {
  flex: none;
  padding: 14px 24px 16px;
  border-bottom: 1px solid var(--border);
}
.task-form { display: flex; flex-direction: column; gap: 10px; }
.field { display: flex; gap: 8px; align-items: flex-start; }
.field-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.title-input {
  flex: 1;
  font-family: 'Inter', sans-serif;
  font-size: 15px;
  padding: 11px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--ink);
}
.title-input::placeholder { color: var(--muted); }
.title-input.has-error { border-color: var(--high); }
.field-error { color: var(--high); font-size: 12.5px; margin: -4px 0 0; }

.desc-input {
  flex: 1;
  font-family: 'Inter', sans-serif;
  font-size: 13.5px;
  padding: 9px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--ink);
  resize: vertical;
  min-height: 36px;
}
.desc-input::placeholder { color: var(--muted); }

.submit-btn {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--accent);
  color: #fff;
  border: none;
  padding: 0 16px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s ease, transform 0.1s ease;
}
.submit-btn:hover { background: var(--accent-ink); }
.submit-btn:active { transform: scale(0.97); }

.text-btn {
  align-self: flex-start;
  background: none;
  border: none;
  color: var(--muted);
  font-size: 13px;
  text-decoration: underline;
  cursor: pointer;
  padding: 2px 0;
}
.text-btn:hover { color: var(--ink); }

/* ---------- Priority selector ---------- */
.priority-group { display: inline-flex; gap: 6px; }
.priority-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 600;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--muted);
  cursor: pointer;
  transition: all 0.15s ease;
}
.priority-btn .priority-dot {
  width: 7px; height: 7px; border-radius: 50%; background: currentColor; opacity: 0.55;
}
.priority-btn.priority-low.is-active { background: var(--low-bg); border-color: var(--low); color: var(--low); }
.priority-btn.priority-medium.is-active { background: var(--medium-bg); border-color: var(--medium); color: var(--medium); }
.priority-btn.priority-high.is-active { background: var(--high-bg); border-color: var(--high); color: var(--high); }
.priority-btn:not(.is-active):hover { border-color: var(--ink); color: var(--ink); }

/* ---------- Date chips ---------- */
.date-group { display: inline-flex; gap: 6px; flex-wrap: wrap; }
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--muted);
  cursor: pointer;
  position: relative;
  transition: all 0.15s ease;
}
.chip.is-active { background: var(--accent); border-color: var(--accent); color: #fff; }
.chip:not(.is-active):hover { border-color: var(--ink); color: var(--ink); }
.date-chip { padding: 6px 10px; }
.date-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  width: 100%;
}

/* ---------- Tabs ---------- */
.tabs {
  flex: none;
  display: flex;
  gap: 4px;
  padding: 12px 20px 0;
}
.tab-btn {
  font-family: 'Fraunces', serif;
  font-size: 15px;
  font-weight: 600;
  color: var(--muted);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  padding: 8px 10px 12px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  transition: color 0.15s ease;
}
.tab-btn.is-active { color: var(--ink); border-bottom-color: var(--accent); }
.tab-btn:hover { color: var(--ink); }
.tab-count {
  font-family: 'Inter', sans-serif;
  font-size: 11px;
  font-weight: 700;
  background: var(--border);
  color: var(--ink);
  border-radius: 999px;
  padding: 1px 7px;
}
.tab-btn.is-active .tab-count { background: var(--accent); color: #fff; }

/* ---------- List area ---------- */
.list-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 8px 16px 20px;
}
.task-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  animation: panel-fade 0.22s ease;
}

@keyframes panel-fade {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ---------- Task item ---------- */
.task-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px 12px 12px 14px;
  transition: opacity 0.17s ease, transform 0.17s ease, max-height 0.17s ease;
}
.task-item.is-overdue { border-color: var(--high); }
.task-item.is-removing { opacity: 0; transform: scale(0.97) translateX(6px); }

.task-checkbox {
  flex: none;
  width: 24px; height: 24px;
  background: none;
  border: none;
  padding: 0;
  margin-top: 1px;
  cursor: pointer;
  color: var(--muted);
}
.check-icon { width: 24px; height: 24px; }
.check-ring {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  opacity: 0.55;
  transition: stroke 0.15s ease, opacity 0.15s ease;
}
.check-mark {
  fill: none;
  stroke: var(--low);
  stroke-width: 2.4;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 20;
  stroke-dashoffset: 20;
  transition: stroke-dashoffset 0.25s ease 0.02s;
}
.task-item.is-completed .check-mark { stroke-dashoffset: 0; }
.task-item.is-completed .check-ring { stroke: var(--low); opacity: 1; }

.task-body { flex: 1; min-width: 0; }
.task-title-row { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
.task-title {
  font-size: 14.5px;
  font-weight: 500;
  color: var(--ink);
  transition: color 0.15s ease;
}
.task-item.is-completed .task-title { color: var(--muted); text-decoration: line-through; }

.task-description {
  margin: 3px 0 0;
  font-size: 13px;
  color: var(--muted);
  line-height: 1.4;
}
.task-item.is-completed .task-description { text-decoration: line-through; }

.task-meta { display: flex; gap: 10px; align-items: center; margin-top: 7px; flex-wrap: wrap; }
.task-date {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 12px; color: var(--muted); font-weight: 500;
}
.overdue-badge {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11.5px; font-weight: 700; color: var(--high);
  background: var(--high-bg); padding: 2px 8px; border-radius: 999px;
}

.priority-badge {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
  padding: 2px 8px; border-radius: 999px;
}
.priority-badge .priority-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.priority-badge.priority-low { background: var(--low-bg); color: var(--low); }
.priority-badge.priority-medium { background: var(--medium-bg); color: var(--medium); }
.priority-badge.priority-high { background: var(--high-bg); color: var(--high); }

.task-actions { flex: none; display: flex; align-items: center; gap: 2px; }
.icon-btn {
  width: 30px; height: 30px;
  display: inline-flex; align-items: center; justify-content: center;
  background: none; border: none; border-radius: 8px;
  color: var(--muted); cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}
.icon-btn:hover { background: var(--bg); color: var(--ink); }
.icon-btn.danger:hover { background: var(--high-bg); color: var(--high); }
.confirm-row { display: inline-flex; align-items: center; gap: 4px; }
.confirm-label { font-size: 12px; color: var(--high); font-weight: 600; margin-right: 2px; }

/* ---------- Empty state ---------- */
.empty-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  text-align: center; padding: 56px 24px; color: var(--muted);
  animation: panel-fade 0.22s ease;
}
.empty-icon { color: var(--border); margin-bottom: 10px; }
.empty-title { font-family: 'Fraunces', serif; font-size: 16px; font-weight: 600; color: var(--ink); margin: 0; }
.empty-sub { font-size: 13px; margin: 4px 0 0; }

/* ---------- Edit modal ---------- */
.modal-overlay {
  position: absolute; inset: 0;
  background: rgba(42,39,35,0.32);
  display: flex; align-items: flex-end; justify-content: center;
  padding: 0;
  animation: overlay-fade 0.15s ease;
  z-index: 10;
}
@keyframes overlay-fade { from { opacity: 0; } to { opacity: 1; } }
.modal {
  background: var(--surface);
  width: 100%;
  max-width: 100%;
  border-radius: 18px 18px 0 0;
  padding: 18px 20px 22px;
  border: 1px solid var(--border);
  border-bottom: none;
  animation: modal-rise 0.2s ease;
}
@keyframes modal-rise { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.modal-header h2 { font-family: 'Fraunces', serif; font-size: 17px; margin: 0; }

/* ---------- Responsive ---------- */
@media (min-width: 640px) {
  .todo-app { margin: 24px auto; }
  .modal-overlay { align-items: center; padding: 24px; }
  .modal { max-width: 440px; border-radius: 16px; border-bottom: 1px solid var(--border); }
}

@media (prefers-reduced-motion: reduce) {
  .todo-app *, .todo-app *::before, .todo-app *::after {
    animation-duration: 0.001ms !important;
    transition-duration: 0.001ms !important;
  }
}
`;
