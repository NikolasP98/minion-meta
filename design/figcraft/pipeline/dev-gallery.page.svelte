<script lang="ts">
  // Scratch-only component gallery for the FigCraft replica (not committed).
  // Every sample sits in <section id="cmp-<Component>-<state>"> so the DOM extractor
  // turns each into its own frame on the "Components" page.
  import { Button, Badge, Card, Input, Checkbox, Radio, Textarea, IconButton, FormField } from '@minion-stack/ui';
  import {
    Spinner, Skeleton, PageHeader, Select, Toggle, Tabs, SegmentedControl, EmptyState, SideNav,
    StatusDot, ProgressBar, Chip, Avatar,
  } from '$lib/components/ui';
  import {
    Inbox, Plus, Search, Settings, Users, Calendar, Pencil, Copy, Share2, Trash2, Ellipsis, Info,
    LayoutDashboard, ShoppingCart, Package, ChartColumn, FolderInput, Eye,
  } from 'lucide-svelte';
  import { onMount, tick } from 'svelte';
  import { browser } from '$app/environment';
  import * as toast from '@zag-js/toast';
  import { normalizeProps, useMachine } from '@zag-js/svelte';
  import type { EChartsOption } from 'echarts';
  import {
    Modal, Popover, Dropdown, ContextMenu, Tooltip, Combobox, DraggableDialog,
    type DropdownItem, type ContextMenuItem,
  } from '$lib/components/ui';
  import EntityChip from '$lib/components/ui/EntityChip.svelte';
  import type { SideNavGroup } from '$lib/components/ui/SideNav.svelte';
  import DataTable, { type DataColumn } from '$lib/components/data-table/DataTable.svelte';
  import Chart from '$lib/components/charts/Chart.svelte';
  import Sparkline from '$lib/components/charts/Sparkline.svelte';
  import ToastItem from '$lib/components/layout/ToastItem.svelte';
  import { KIND_COLOR, type EntityRef } from '$lib/types/entities';

  // shortcut: scratch page only — every <dialog> opens NON-modal (in flow, no top layer, no inert,
  // no backdrop) so the open Modal sample stays inside its own section; never do this in app code.
  if (browser) {
    HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
  }

  // ── Overlays ──────────────────────────────────────────────────────────────
  const trayItems: DropdownItem[] = [
    { value: 'edit', label: 'Edit', icon: Pencil },
    { value: 'duplicate', label: 'Duplicate', icon: Copy },
    { value: 'share', label: 'Share link', icon: Share2 },
    { value: 'd1', label: '', divider: true },
    { value: 'delete', label: 'Delete', icon: Trash2, danger: true },
  ];
  const ctxItems: ContextMenuItem[] = [
    { id: 'open', label: 'Open', icon: Eye },
    { id: 'edit', label: 'Edit', icon: Pencil },
    { id: 'pin', label: 'Pinned', selection: 'checkbox', checked: true },
    {
      id: 'move',
      label: 'Move to',
      icon: FolderInput,
      children: [
        { id: 'inbox', label: 'Inbox' },
        { id: 'archive', label: 'Archive' },
      ],
    },
    { id: 'delete', label: 'Delete', icon: Trash2, danger: true },
  ];
  const cities = [
    { id: 'lim', name: 'Lima' },
    { id: 'bog', name: 'Bogotá' },
    { id: 'scl', name: 'Santiago' },
    { id: 'mex', name: 'Mexico City' },
    { id: 'bue', name: 'Buenos Aires' },
    { id: 'mad', name: 'Madrid' },
  ];
  let comboboxEl = $state<HTMLDivElement | null>(null);

  // ── Toasts: same group machine as layout/Toaster.svelte, on a page-local store ──
  const galleryToasts = toast.createStore({ placement: 'top-end', overlap: false, max: 6, gap: 12, offsets: '0px' });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toastService = useMachine(toast.group.machine as any, () => ({ id: 'gallery-toaster', store: galleryToasts }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toastApi = $derived(toast.group.connect(toastService as any, normalizeProps));
  const toastSamples = [
    { type: 'info', title: 'Sync scheduled', description: 'Next run in 15 minutes.' },
    { type: 'success', title: 'Invoice sent', description: 'INV-0042 delivered to the customer.' },
    { type: 'warning', title: 'Low stock', description: 'Serum 30ml has 2 units left.' },
    { type: 'error', title: 'Payment failed', description: 'The card was declined. Try another method.' },
  ] as const;

  // ── DataTable ─────────────────────────────────────────────────────────────
  type Row = { id: string; name: string; email: string; orders: number; total: number; status: 'active' | 'paused' | 'churned' };
  const tableColumns: DataColumn<Row>[] = [
    { key: 'name', label: 'Customer', fill: true, width: 180 },
    { key: 'email', label: 'Email', width: 220 },
    { key: 'orders', label: 'Orders', align: 'right', width: 90 },
    { key: 'total', label: 'Total', align: 'right', width: 110 },
    { key: 'status', label: 'Status', width: 120 },
  ];
  const tableRows: Row[] = [
    { id: '1', name: 'Ava Thompson', email: 'ava@example.com', orders: 14, total: 1280.5, status: 'active' },
    { id: '2', name: 'Liam Carter', email: 'liam@example.com', orders: 3, total: 210, status: 'paused' },
    { id: '3', name: 'Mia Rodriguez', email: 'mia@example.com', orders: 27, total: 3415.25, status: 'active' },
    { id: '4', name: 'Noah Patel', email: 'noah@example.com', orders: 0, total: 0, status: 'churned' },
    { id: '5', name: 'Emma Nguyen', email: 'emma@example.com', orders: 8, total: 640, status: 'active' },
    { id: '6', name: 'Lucas Silva', email: 'lucas@example.com', orders: 5, total: 395.75, status: 'paused' },
    { id: '7', name: 'Sofia Rossi', email: 'sofia@example.com', orders: 19, total: 2088, status: 'active' },
    { id: '8', name: 'Ethan Kim', email: 'ethan@example.com', orders: 1, total: 45, status: 'churned' },
  ];
  const statusTone = { active: 'success', paused: 'warning', churned: 'error' } as const;
  const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  // Set after mount: the table's own init effects reconcile/clear the selection on first render.
  let tableSelected = $state(new Set<string>());

  // ── Charts ────────────────────────────────────────────────────────────────
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const revenue = [12, 18, 15, 22, 28, 25, 31, 36, 33, 40, 44, 48];
  const orders = [40, 52, 47, 61, 70, 66, 78, 85, 80, 92, 97, 104];
  const chartGrid = { left: 8, right: 8, top: 16, bottom: 8, containLabel: true };
  const lineOptions: EChartsOption = {
    animation: false,
    grid: chartGrid,
    xAxis: { type: 'category', data: months },
    yAxis: { type: 'value' },
    series: [{ type: 'line', name: 'Revenue', data: revenue, smooth: true, areaStyle: { opacity: 0.15 } }],
  };
  const barOptions: EChartsOption = {
    animation: false,
    grid: chartGrid,
    xAxis: { type: 'category', data: months },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', name: 'Orders', data: orders, barMaxWidth: 28 }],
  };
  const donutOptions: EChartsOption = {
    animation: false,
    legend: { bottom: 0 },
    series: [{
      type: 'pie',
      radius: ['55%', '78%'],
      center: ['50%', '42%'],
      label: { show: false },
      data: months.map((name, i) => ({ name, value: revenue[i] })),
    }],
  };
  const sparkBins = [4, 6, 5, 8, 12, 9, 14, 13, 17, 15, 19, 22];

  // ── SideNav ───────────────────────────────────────────────────────────────
  const navGroups: SideNavGroup[] = [
    {
      label: 'Workspace',
      items: [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'inbox', label: 'Inbox', icon: Inbox, badge: 12 },
        { id: 'calendar', label: 'Calendar', icon: Calendar },
        { id: 'customers', label: 'Customers', icon: Users },
      ],
    },
    {
      label: 'Operations',
      items: [
        { id: 'sales', label: 'Sales', icon: ShoppingCart },
        { id: 'stock', label: 'Stock', icon: Package, dot: true },
        { id: 'reports', label: 'Reports', icon: ChartColumn },
        { id: 'settings', label: 'Settings', icon: Settings },
      ],
    },
  ];

  // ── EntityChip ────────────────────────────────────────────────────────────
  const entityRefs: EntityRef[] = [
    { kind: 'org', id: 'o1', label: 'Acme Clinic', icon: 'Building2', color: KIND_COLOR.org },
    { kind: 'area', id: 'a1', label: 'Front desk', icon: 'Users', color: KIND_COLOR.area },
    { kind: 'agent', id: 'ag1', label: 'Support bot', color: KIND_COLOR.agent },
    { kind: 'skill', id: 's1', label: 'book-appointment', color: KIND_COLOR.skill },
    { kind: 'tool', id: 't1', label: 'Calendar API', color: KIND_COLOR.tool },
    { kind: 'user', id: 'u1', label: 'Nikolas P.', color: KIND_COLOR.user },
  ];

  onMount(async () => {
    await tick();
    // The open Dialog took the body scroll lock; a gallery page must stay scrollable.
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    for (const t of toastSamples) galleryToasts.create({ ...t, duration: Infinity });
    tableSelected = new Set(['2', '5']);
    // Combobox exposes no open prop: click its chevron (Zag TRIGGER.CLICK) LAST, so no later focus move closes it.
    comboboxEl?.querySelector<HTMLButtonElement>('.cb-chevron')?.click();
  });

  const btnVariants = ['primary', 'secondary', 'ghost', 'danger', 'outline'] as const;
  const btnSizes = ['xs', 'sm', 'md', 'lg'] as const;
  const semantic = ['success', 'error', 'warning', 'info', 'accent', 'brand'] as const;
  const statuses = ['running', 'thinking', 'idle', 'aborted'] as const;
  const options = [
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B' },
    { value: 'c', label: 'Option C' },
  ];
  const tabs = [
    { value: 'overview', label: 'Overview' },
    { value: 'activity', label: 'Activity' },
    { value: 'settings', label: 'Settings' },
  ];
  const segments = [
    { value: 'day', label: 'Day' },
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
  ];
  const navItems = [
    { id: 'sell', label: 'Sell', icon: Plus },
    { id: 'accounts', label: 'Accounts', icon: Users, badge: '298' },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];
</script>

<svelte:head><title>Components gallery</title></svelte:head>

<div class="gallery">
  <h1 class="g-title">Component gallery · @minion-stack/ui + $lib/components/ui</h1>

  {#each btnVariants as v (v)}
    <section id={`cmp-Button-${v}`} class="sample">
      <h2 class="label">Button / {v}</h2>
      <div class="row">
        {#each btnSizes as s (s)}
          <svelte:boundary><Button variant={v} size={s}>{v} {s}</Button>{#snippet failed()}<span class="err">Button</span>{/snippet}</svelte:boundary>
        {/each}
        <svelte:boundary><Button variant={v} disabled>disabled</Button>{#snippet failed()}<span class="err">Button</span>{/snippet}</svelte:boundary>
        <svelte:boundary><Button variant={v} loading>loading</Button>{#snippet failed()}<span class="err">Button</span>{/snippet}</svelte:boundary>
      </div>
    </section>
  {/each}

  <section id="cmp-IconButton-all" class="sample">
    <h2 class="label">IconButton / variants</h2>
    <div class="row">
      {#each btnVariants as v (v)}
        <svelte:boundary><IconButton label={v} variant={v}>{#snippet icon()}<Plus size={16} />{/snippet}</IconButton>{#snippet failed()}<span class="err">IconButton</span>{/snippet}</svelte:boundary>
      {/each}
    </div>
  </section>

  <section id="cmp-Badge-semantic" class="sample">
    <h2 class="label">Badge / semantic</h2>
    <div class="row">
      {#each semantic as s (s)}
        <svelte:boundary><Badge variant="semantic" value={s}>{s}</Badge>{#snippet failed()}<span class="err">Badge</span>{/snippet}</svelte:boundary>
      {/each}
      <svelte:boundary><Badge variant="neutral">neutral</Badge>{#snippet failed()}<span class="err">Badge</span>{/snippet}</svelte:boundary>
    </div>
  </section>
  <section id="cmp-Badge-status" class="sample">
    <h2 class="label">Badge / status</h2>
    <div class="row">
      {#each statuses as s (s)}
        <svelte:boundary><Badge variant="status" value={s} dot>{s}</Badge>{#snippet failed()}<span class="err">Badge</span>{/snippet}</svelte:boundary>
      {/each}
      <svelte:boundary><Badge variant="status" value="running" dot pulse>pulse</Badge>{#snippet failed()}<span class="err">Badge</span>{/snippet}</svelte:boundary>
    </div>
  </section>

  <section id="cmp-Card-elevations" class="sample">
    <h2 class="label">Card / elevations 1–4</h2>
    <div class="row">
      {#each [1, 2, 3, 4] as e (e)}
        <svelte:boundary>
          <Card elevation={e} padding="md">
            {#snippet header()}<strong>Card elevation {e}</strong>{/snippet}
            <p>Body text sits here. Cards hold a module's content block.</p>
            {#snippet footer()}<span class="muted">Footer</span>{/snippet}
          </Card>
          {#snippet failed()}<span class="err">Card</span>{/snippet}
        </svelte:boundary>
      {/each}
    </div>
  </section>
  <section id="cmp-Card-interactive" class="sample">
    <h2 class="label">Card / interactive</h2>
    <div class="row">
      <svelte:boundary><Card elevation={2} padding="md" interactive><p>Interactive card (hover border + shadow)</p></Card>{#snippet failed()}<span class="err">Card</span>{/snippet}</svelte:boundary>
    </div>
  </section>

  <section id="cmp-Input-states" class="sample">
    <h2 class="label">Input / states</h2>
    <div class="col">
      <svelte:boundary><Input label="Default" placeholder="Type here" />{#snippet failed()}<span class="err">Input</span>{/snippet}</svelte:boundary>
      <svelte:boundary><Input label="With value + helper" value="Minion" helper="Helper text under the field" />{#snippet failed()}<span class="err">Input</span>{/snippet}</svelte:boundary>
      <svelte:boundary><Input label="Error" value="bad" error="This value is not valid" />{#snippet failed()}<span class="err">Input</span>{/snippet}</svelte:boundary>
      <svelte:boundary><Input label="Disabled" value="read only" disabled />{#snippet failed()}<span class="err">Input</span>{/snippet}</svelte:boundary>
      <svelte:boundary><Input label="Search, leading icon" type="search" placeholder="Search…">{#snippet leading()}<Search size={16} />{/snippet}</Input>{#snippet failed()}<span class="err">Input</span>{/snippet}</svelte:boundary>
    </div>
  </section>
  <section id="cmp-Input-sizes" class="sample">
    <h2 class="label">Input / sizes</h2>
    <div class="col">
      {#each ['sm', 'md', 'lg', 'touch'] as s (s)}
        <svelte:boundary><Input label={`Size ${s}`} size={s} placeholder={s} />{#snippet failed()}<span class="err">Input</span>{/snippet}</svelte:boundary>
      {/each}
    </div>
  </section>
  <section id="cmp-Textarea-states" class="sample">
    <h2 class="label">Textarea</h2>
    <div class="col">
      <svelte:boundary><Textarea label="Notes" placeholder="Write something" rows={3} />{#snippet failed()}<span class="err">Textarea</span>{/snippet}</svelte:boundary>
      <svelte:boundary><Textarea label="Error" value="x" error="Too short" rows={2} />{#snippet failed()}<span class="err">Textarea</span>{/snippet}</svelte:boundary>
    </div>
  </section>
  <section id="cmp-Select-states" class="sample">
    <h2 class="label">Select</h2>
    <div class="col">
      <svelte:boundary><Select label="Choose" {options} value="a" />{#snippet failed()}<span class="err">Select</span>{/snippet}</svelte:boundary>
      <svelte:boundary><Select label="Error" {options} error="Pick one" />{#snippet failed()}<span class="err">Select</span>{/snippet}</svelte:boundary>
      <svelte:boundary><Select label="Disabled" {options} value="b" disabled />{#snippet failed()}<span class="err">Select</span>{/snippet}</svelte:boundary>
    </div>
  </section>
  <section id="cmp-Checkbox-Radio" class="sample">
    <h2 class="label">Checkbox + Radio</h2>
    <div class="col">
      <svelte:boundary><Checkbox label="Unchecked" />{#snippet failed()}<span class="err">Checkbox</span>{/snippet}</svelte:boundary>
      <svelte:boundary><Checkbox label="Checked, with helper" checked helper="Helper" />{#snippet failed()}<span class="err">Checkbox</span>{/snippet}</svelte:boundary>
      <svelte:boundary><Checkbox label="Indeterminate" indeterminate />{#snippet failed()}<span class="err">Checkbox</span>{/snippet}</svelte:boundary>
      <svelte:boundary><Checkbox label="Disabled" disabled />{#snippet failed()}<span class="err">Checkbox</span>{/snippet}</svelte:boundary>
      <svelte:boundary><Radio label="Radio A" value="a" group="a" name="r" />{#snippet failed()}<span class="err">Radio</span>{/snippet}</svelte:boundary>
      <svelte:boundary><Radio label="Radio B" value="b" group="a" name="r" />{#snippet failed()}<span class="err">Radio</span>{/snippet}</svelte:boundary>
    </div>
  </section>
  <section id="cmp-Toggle-states" class="sample">
    <h2 class="label">Toggle</h2>
    <div class="col">
      <svelte:boundary><Toggle label="Off" checked={false} />{#snippet failed()}<span class="err">Toggle</span>{/snippet}</svelte:boundary>
      <svelte:boundary><Toggle label="On" checked={true} description="With a description line" />{#snippet failed()}<span class="err">Toggle</span>{/snippet}</svelte:boundary>
      <svelte:boundary><Toggle label="Pending" checked={true} pending />{#snippet failed()}<span class="err">Toggle</span>{/snippet}</svelte:boundary>
      <svelte:boundary><Toggle label="Disabled" checked={false} disabled />{#snippet failed()}<span class="err">Toggle</span>{/snippet}</svelte:boundary>
    </div>
  </section>

  <section id="cmp-Tabs-md" class="sample">
    <h2 class="label">Tabs</h2>
    <div class="col">
      <svelte:boundary><Tabs {tabs} value="overview" id="g-tabs-md" aria-label="Tabs md" />{#snippet failed()}<span class="err">Tabs</span>{/snippet}</svelte:boundary>
      <svelte:boundary><Tabs {tabs} value="activity" id="g-tabs-sm" size="sm" aria-label="Tabs sm" />{#snippet failed()}<span class="err">Tabs</span>{/snippet}</svelte:boundary>
      <svelte:boundary><Tabs {tabs} value="settings" id="g-tabs-fit" fitted aria-label="Tabs fitted" />{#snippet failed()}<span class="err">Tabs</span>{/snippet}</svelte:boundary>
    </div>
  </section>
  <section id="cmp-SegmentedControl-all" class="sample">
    <h2 class="label">SegmentedControl</h2>
    <div class="col">
      <svelte:boundary><SegmentedControl items={segments} value="day" aria-label="Range sm" />{#snippet failed()}<span class="err">SegmentedControl</span>{/snippet}</svelte:boundary>
      <svelte:boundary><SegmentedControl items={segments} value="week" size="md" aria-label="Range md" />{#snippet failed()}<span class="err">SegmentedControl</span>{/snippet}</svelte:boundary>
    </div>
  </section>

  <section id="cmp-Chip-all" class="sample">
    <h2 class="label">Chip</h2>
    <div class="row">
      <svelte:boundary><Chip>Default</Chip>{#snippet failed()}<span class="err">Chip</span>{/snippet}</svelte:boundary>
      <svelte:boundary><Chip count={12}>With count</Chip>{#snippet failed()}<span class="err">Chip</span>{/snippet}</svelte:boundary>
      <svelte:boundary><Chip onRemove={() => {}}>Removable</Chip>{#snippet failed()}<span class="err">Chip</span>{/snippet}</svelte:boundary>
      {#each ['active', 'attention', 'disabled'] as st (st)}
        <svelte:boundary><Chip status={st}>{st}</Chip>{#snippet failed()}<span class="err">Chip</span>{/snippet}</svelte:boundary>
      {/each}
    </div>
  </section>
  <section id="cmp-Avatar-sizes" class="sample">
    <h2 class="label">Avatar</h2>
    <div class="row">
      {#each ['xs', 'sm', 'md', 'lg', 'xl'] as s (s)}
        <svelte:boundary><Avatar name="Tenancy Owner" size={s} />{#snippet failed()}<span class="err">Avatar</span>{/snippet}</svelte:boundary>
      {/each}
      <svelte:boundary><Avatar name="Minion" src="/mascot.png" size="md" />{#snippet failed()}<span class="err">Avatar</span>{/snippet}</svelte:boundary>
    </div>
  </section>
  <section id="cmp-StatusDot-all" class="sample">
    <h2 class="label">StatusDot</h2>
    <div class="row">
      {#each statuses as s (s)}
        <svelte:boundary><StatusDot status={s} label={s} expanded />{#snippet failed()}<span class="err">StatusDot</span>{/snippet}</svelte:boundary>
      {/each}
      {#each ['active', 'attention', 'disabled'] as s (s)}
        <svelte:boundary><StatusDot state={s} label={s} expanded size="lg" />{#snippet failed()}<span class="err">StatusDot</span>{/snippet}</svelte:boundary>
      {/each}
    </div>
  </section>
  <section id="cmp-ProgressBar-all" class="sample">
    <h2 class="label">ProgressBar</h2>
    <div class="col">
      <svelte:boundary><ProgressBar value={25} label="25 of 100" detail="sm" size="sm" />{#snippet failed()}<span class="err">ProgressBar</span>{/snippet}</svelte:boundary>
      <svelte:boundary><ProgressBar value={60} label="60%" detail="md" />{#snippet failed()}<span class="err">ProgressBar</span>{/snippet}</svelte:boundary>
      <svelte:boundary><ProgressBar value={100} label="Complete" size="lg" />{#snippet failed()}<span class="err">ProgressBar</span>{/snippet}</svelte:boundary>
      <svelte:boundary><ProgressBar value={null} label="Indeterminate" />{#snippet failed()}<span class="err">ProgressBar</span>{/snippet}</svelte:boundary>
    </div>
  </section>
  <section id="cmp-Spinner-Skeleton" class="sample">
    <h2 class="label">Spinner + Skeleton</h2>
    <div class="row">
      {#each ['sm', 'md', 'lg'] as s (s)}
        <svelte:boundary><Spinner size={s} />{#snippet failed()}<span class="err">Spinner</span>{/snippet}</svelte:boundary>
      {/each}
      <svelte:boundary><Skeleton width="160px" height="16px" />{#snippet failed()}<span class="err">Skeleton</span>{/snippet}</svelte:boundary>
      <svelte:boundary><Skeleton width="40px" height="40px" rounded="9999px" />{#snippet failed()}<span class="err">Skeleton</span>{/snippet}</svelte:boundary>
      <svelte:boundary><Skeleton width="240px" height="80px" rounded="12px" />{#snippet failed()}<span class="err">Skeleton</span>{/snippet}</svelte:boundary>
    </div>
  </section>

  <section id="cmp-PageHeader-all" class="sample">
    <h2 class="label">PageHeader</h2>
    <div class="wide">
      <svelte:boundary>
        <PageHeader title="Point of Sale" subtitle="Sell, accounts and catalog in one place" sticky={false}>
          {#snippet primaryActions()}<Button variant="primary" size="sm">New sale</Button>{/snippet}
          {#snippet secondaryActions()}<Button variant="outline" size="sm">Export</Button>{/snippet}
        </PageHeader>
        {#snippet failed()}<span class="err">PageHeader</span>{/snippet}
      </svelte:boundary>
    </div>
  </section>
  <section id="cmp-EmptyState-tones" class="sample">
    <h2 class="label">EmptyState</h2>
    <div class="row">
      <svelte:boundary>
        <EmptyState title="No items yet" description="Create your first item to get started." icon={Inbox}>
          {#snippet action()}<Button variant="primary" size="sm">Create</Button>{/snippet}
        </EmptyState>
        {#snippet failed()}<span class="err">EmptyState</span>{/snippet}
      </svelte:boundary>
      <svelte:boundary><EmptyState title="Something went wrong" description="Retry or contact support." tone="error" icon={Inbox} compact />{#snippet failed()}<span class="err">EmptyState</span>{/snippet}</svelte:boundary>
    </div>
  </section>
  <section id="cmp-SideNav-all" class="sample">
    <h2 class="label">SideNav</h2>
    <div class="row">
      <div class="nav-box">
        <svelte:boundary><SideNav items={navItems} activeId="sell" header="FLOWS" ariaLabel="Module nav" />{#snippet failed()}<span class="err">SideNav</span>{/snippet}</svelte:boundary>
      </div>
      <div class="nav-box">
        <svelte:boundary><SideNav items={navItems} activeId="accounts" search={{ enabled: true, placeholder: 'Filter…' }} leftBorder ariaLabel="Module nav with search" />{#snippet failed()}<span class="err">SideNav</span>{/snippet}</svelte:boundary>
      </div>
    </div>
  </section>
  <section id="cmp-FormField-all" class="sample">
    <h2 class="label">FormField</h2>
    <div class="col">
      <svelte:boundary>
        <FormField label="Wrapped control" helper="FormField supplies id, label, helper and error">
          {#snippet children(ctl)}<input id={ctl.id} class="native" placeholder="native input inside FormField" />{/snippet}
        </FormField>
        {#snippet failed()}<span class="err">FormField</span>{/snippet}
      </svelte:boundary>
    </div>
  </section>

  <!-- ── Overlays ─────────────────────────────────────────────────────────── -->
  <section id="cmp-Modal-open" class="sample">
    <h2 class="label">Modal / open</h2>
    <div class="wide">
      <svelte:boundary>
        <Modal open={true} title="Archive 3 customers?" onclose={() => {}}>
          <p class="body-copy">Archived customers disappear from the active list and their open bookings are kept. You can restore them from Settings at any time.</p>
          {#snippet footer()}
            <Button variant="outline" size="sm">Cancel</Button>
            <Button variant="primary" size="sm">Confirm</Button>
          {/snippet}
        </Modal>
        {#snippet failed()}<span class="err">Modal</span>{/snippet}
      </svelte:boundary>
    </div>
  </section>

  <section id="cmp-Popover-open" class="sample overlay-box">
    <h2 class="label">Popover / open</h2>
    <div class="col">
      <svelte:boundary>
        <Popover placement="bottom" label="Filters">
          {#snippet trigger()}<Button variant="outline" size="sm">Filters</Button>{/snippet}
          <div class="panel-body">Live panel (closed)</div>
        </Popover>
        {#snippet failed()}<span class="err">Popover</span>{/snippet}
      </svelte:boundary>
      <!-- Static copy of Popover's open panel (same utility classes); the live one portals to <body>. -->
      <div class="surface-3 rounded-[var(--radius-md)] p-1 g-panel" role="dialog" aria-label="Filters">
        <div class="panel-body">
          <strong class="panel-title">Filter customers</strong>
          <Checkbox label="Active only" checked />
          <Checkbox label="Has open balance" />
          <Checkbox label="Visited this month" />
          <div class="row panel-actions">
            <Button variant="ghost" size="xs">Clear</Button>
            <Button variant="primary" size="xs">Apply</Button>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section id="cmp-Dropdown-open" class="sample overlay-box">
    <h2 class="label">Dropdown / open (tray menu)</h2>
    <div class="col">
      <svelte:boundary>
        <Dropdown items={trayItems}>
          {#snippet trigger()}<IconButton label="More actions" variant="ghost">{#snippet icon()}<Ellipsis size={16} />{/snippet}</IconButton>{/snippet}
        </Dropdown>
        {#snippet failed()}<span class="err">Dropdown</span>{/snippet}
      </svelte:boundary>
      <!-- Static copy of Dropdown's open panel (same utility classes); the live one portals to <body>. -->
      <div class="min-w-40 surface-3 rounded-[var(--radius-md)] p-1 outline-none g-panel" role="menu" aria-label="More actions">
        {#each trayItems as it, i (it.value)}
          {#if it.divider}
            <div role="separator" class="my-1 h-px bg-[var(--hairline)]"></div>
          {:else}
            <button
              type="button"
              role="menuitem"
              class="flex w-full items-center gap-2 px-2.5 py-1.5 rounded-[var(--radius-sm)] text-sm text-left bg-transparent border-none cursor-pointer outline-none {it.danger ? 'text-destructive' : 'text-foreground'} {i === 0 ? 'bg-foreground/[0.06]' : ''}"
            >
              <it.icon size={14} class={it.danger ? 'text-destructive' : 'text-muted-foreground'} />
              <span class="flex-1">{it.label}</span>
            </button>
          {/if}
        {/each}
      </div>
    </div>
  </section>

  <section id="cmp-ContextMenu-open" class="sample">
    <h2 class="label">ContextMenu / open</h2>
    <div class="ctx-host">
      <svelte:boundary>
        <ContextMenu x={0} y={0} items={ctxItems} label="Row actions" onselect={() => {}} onclose={() => {}} />
        {#snippet failed()}<span class="err">ContextMenu</span>{/snippet}
      </svelte:boundary>
    </div>
  </section>

  <section id="cmp-Tooltip-open" class="sample">
    <h2 class="label">Tooltip / open</h2>
    <div class="col tip-col">
      <!-- Static copy of Tooltip's panel (same utility classes); the live one is hover-driven and portals to <body>. -->
      <div class="surface-3 rounded-[var(--radius-md)] px-2.5 py-1.5 text-xs text-foreground max-w-[280px] leading-relaxed g-panel" role="tooltip">
        Sync runs every 15 minutes
      </div>
      <svelte:boundary>
        <Tooltip label="Sync runs every 15 minutes">
          <IconButton label="About sync" variant="ghost">{#snippet icon()}<Info size={16} />{/snippet}</IconButton>
        </Tooltip>
        {#snippet failed()}<span class="err">Tooltip</span>{/snippet}
      </svelte:boundary>
    </div>
  </section>

  <section id="cmp-Combobox-open" class="sample overlay-box">
    <h2 class="label">Combobox / open</h2>
    <div class="col" bind:this={comboboxEl}>
      <svelte:boundary>
        <Combobox id="g-combobox" items={cities} itemToValue={(c) => c.id} itemToString={(c) => c.name} label="City" placeholder="Search a city…" />
        {#snippet failed()}<span class="err">Combobox</span>{/snippet}
      </svelte:boundary>
    </div>
  </section>

  <section id="cmp-Toast-all" class="sample">
    <h2 class="label">Toast / info · success · warning · error</h2>
    <svelte:boundary>
      <div {...toastApi.getGroupProps() as Record<string, unknown>} class="g-toasts">
        {#each toastApi.getToasts() as t, index (t.id)}
          <!-- eslint-disable-next-line @typescript-eslint/no-explicit-any -->
          <ToastItem toast={t} {index} parent={toastService as any} />
        {/each}
      </div>
      {#snippet failed()}<span class="err">Toast</span>{/snippet}
    </svelte:boundary>
  </section>

  <!-- ── DataTable ───────────────────────────────────────────────────────── -->
  {#snippet statusCell(row: Row)}
    <Badge variant="semantic" value={statusTone[row.status]}>{row.status}</Badge>
  {/snippet}
  {#snippet totalCell(row: Row)}
    <span class="tabular">{money.format(row.total)}</span>
  {/snippet}
  <section id="cmp-DataTable-populated" class="sample">
    <h2 class="label">DataTable / populated</h2>
    <div class="wide">
      <svelte:boundary>
        <DataTable variant="plain" height="fit" data={tableRows} columns={tableColumns} getRowId={(r) => r.id} selectable bind:selectedIds={tableSelected} searchable cells={{ status: statusCell, total: totalCell }} />
        {#snippet failed()}<span class="err">DataTable</span>{/snippet}
      </svelte:boundary>
    </div>
  </section>
  <section id="cmp-DataTable-empty" class="sample">
    <h2 class="label">DataTable / empty</h2>
    <div class="wide">
      <svelte:boundary>
        <DataTable variant="plain" height="fit" data={[] as Row[]} columns={tableColumns} getRowId={(r) => r.id} searchable emptyMessage="No customers match these filters" />
        {#snippet failed()}<span class="err">DataTable</span>{/snippet}
      </svelte:boundary>
    </div>
  </section>
  <section id="cmp-DataTable-loading" class="sample">
    <h2 class="label">DataTable / loading</h2>
    <div class="wide">
      <svelte:boundary>
        <DataTable variant="plain" height="fit" data={[] as Row[]} columns={tableColumns} getRowId={(r) => r.id} searchable loading loadingRows={6} />
        {#snippet failed()}<span class="err">DataTable</span>{/snippet}
      </svelte:boundary>
    </div>
  </section>
  <section id="cmp-DataTable-error" class="sample">
    <h2 class="label">DataTable / error</h2>
    <div class="wide">
      <svelte:boundary>
        <DataTable variant="plain" height="fit" data={[] as Row[]} columns={tableColumns} getRowId={(r) => r.id} searchable error={new Error('Could not load customers')} onRetry={() => {}} />
        {#snippet failed()}<span class="err">DataTable</span>{/snippet}
      </svelte:boundary>
    </div>
  </section>

  <!-- ── Charts ──────────────────────────────────────────────────────────── -->
  <section id="cmp-Chart-line" class="sample">
    <h2 class="label">Chart / line</h2>
    <div class="chart-box">
      <svelte:boundary><Chart options={lineOptions} height="240px" ariaLabel="Revenue by month" />{#snippet failed()}<span class="err">Chart</span>{/snippet}</svelte:boundary>
    </div>
  </section>
  <section id="cmp-Chart-bar" class="sample">
    <h2 class="label">Chart / bar</h2>
    <div class="chart-box">
      <svelte:boundary><Chart options={barOptions} height="240px" ariaLabel="Orders by month" />{#snippet failed()}<span class="err">Chart</span>{/snippet}</svelte:boundary>
    </div>
  </section>
  <section id="cmp-Chart-donut" class="sample">
    <h2 class="label">Chart / donut</h2>
    <div class="chart-box">
      <svelte:boundary><Chart options={donutOptions} height="280px" ariaLabel="Revenue share by month" />{#snippet failed()}<span class="err">Chart</span>{/snippet}</svelte:boundary>
    </div>
  </section>
  <section id="cmp-Sparkline-all" class="sample">
    <h2 class="label">Sparkline</h2>
    <div class="row">
      <div class="spark"><svelte:boundary><Sparkline bins={sparkBins} />{#snippet failed()}<span class="err">Sparkline</span>{/snippet}</svelte:boundary></div>
      <div class="spark"><svelte:boundary><Sparkline bins={sparkBins} color="var(--color-success)" glow />{#snippet failed()}<span class="err">Sparkline</span>{/snippet}</svelte:boundary></div>
      <div class="spark"><svelte:boundary><Sparkline bins={[...sparkBins].reverse()} color="var(--color-warning)" />{#snippet failed()}<span class="err">Sparkline</span>{/snippet}</svelte:boundary></div>
    </div>
  </section>

  <!-- ── Navigation ──────────────────────────────────────────────────────── -->
  <section id="cmp-SideNav-expanded" class="sample">
    <h2 class="label">SideNav / expanded</h2>
    <div class="row">
      <div class="nav-box nav-tall">
        <svelte:boundary><SideNav items={navGroups} activeId="inbox" header="ACME CLINIC" ariaLabel="Expanded nav" />{#snippet failed()}<span class="err">SideNav</span>{/snippet}</svelte:boundary>
      </div>
    </div>
  </section>
  <section id="cmp-SideNav-collapsed" class="sample">
    <h2 class="label">SideNav / collapsed (icon rail)</h2>
    <div class="row">
      <nav class="nav-rail nav-tall" aria-label="Collapsed nav">
        {#each navGroups as group, gi (group.label)}
          {#if gi > 0}<div class="rail-sep" role="separator"></div>{/if}
          {#each group.items as item (item.id)}
            <svelte:boundary>
              <IconButton label={item.label} variant={item.id === 'inbox' ? 'secondary' : 'ghost'}>{#snippet icon()}<item.icon size={18} />{/snippet}</IconButton>
              {#snippet failed()}<span class="err">IconButton</span>{/snippet}
            </svelte:boundary>
          {/each}
        {/each}
      </nav>
    </div>
  </section>

  <!-- ── Misc ────────────────────────────────────────────────────────────── -->
  <section id="cmp-EntityChip-all" class="sample">
    <h2 class="label">EntityChip / every kind, sm + md</h2>
    <div class="col">
      {#each ['sm', 'md'] as size (size)}
        <div class="row">
          {#each entityRefs as ref (ref.kind)}
            <svelte:boundary><EntityChip {ref} {size} link={false} />{#snippet failed()}<span class="err">EntityChip</span>{/snippet}</svelte:boundary>
          {/each}
        </div>
      {/each}
    </div>
  </section>
  <section id="cmp-Skeleton-list" class="sample">
    <h2 class="label">Skeleton / list</h2>
    <div class="col">
      {#each [1, 2, 3, 4] as i (i)}
        <div class="skel-row">
          <svelte:boundary><Skeleton width="36px" height="36px" rounded="rounded-full" />{#snippet failed()}<span class="err">Skeleton</span>{/snippet}</svelte:boundary>
          <div class="skel-lines">
            <svelte:boundary><Skeleton width="60%" height="12px" />{#snippet failed()}<span class="err">Skeleton</span>{/snippet}</svelte:boundary>
            <svelte:boundary><Skeleton width="40%" height="10px" />{#snippet failed()}<span class="err">Skeleton</span>{/snippet}</svelte:boundary>
          </div>
        </div>
      {/each}
    </div>
  </section>
  <section id="cmp-DraggableDialog-open" class="sample">
    <h2 class="label">DraggableDialog / open</h2>
    <div class="wide">
      <svelte:boundary>
        <DraggableDialog title="Agent · Support bot" z={1} fullscreen={false} x={0} y={0} width="520px" height="300px" onfocus={() => {}} onclose={() => {}} ontogglefullscreen={() => {}} onmove={() => {}}>
          <div class="panel-body window-body">
            <p>Floating, non-modal window. The title bar drags; the corner buttons toggle fullscreen and close.</p>
            <p class="muted">Last message · 2 min ago</p>
          </div>
        </DraggableDialog>
        {#snippet failed()}<span class="err">DraggableDialog</span>{/snippet}
      </svelte:boundary>
    </div>
  </section>
</div>

<style>
  .gallery { padding: 32px 40px 80px; display: flex; flex-direction: column; gap: 28px; max-width: 1360px; }
  .g-title { font-size: 18px; font-weight: 600; margin: 0 0 8px; color: var(--color-text-secondary, #9aa); }
  .sample { padding: 20px 24px; border: 1px dashed var(--color-border, #333); border-radius: 12px; display: flex; flex-direction: column; gap: 14px; }
  .label { margin: 0; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--color-text-muted, #888); }
  .row { display: flex; flex-wrap: wrap; align-items: center; gap: 16px; }
  .col { display: flex; flex-direction: column; gap: 14px; max-width: 420px; }
  .wide { width: 100%; }
  .nav-box { width: 240px; min-height: 220px; border: 1px solid var(--color-border, #333); border-radius: 8px; overflow: hidden; }
  .muted { color: var(--color-text-muted, #888); font-size: 12px; }
  .err { color: #f66; font-size: 12px; }
  .native { padding: 8px 10px; border: 1px solid var(--color-border, #444); border-radius: 6px; background: transparent; color: inherit; width: 100%; }

  /* ── Added samples ───────────────────────────────────────────────────── */
  .overlay-box { position: relative; min-height: 260px; }
  /* Zag positions the list viewport-fixed and only recomputes on scroll (it sits at 0,0 until then); flow it under the input. */
  :global(#cmp-Combobox-open [data-part='positioner']) { position: relative !important; transform: none !important; top: auto !important; left: auto !important; width: 100% !important; }
  .body-copy { margin: 0; font-size: var(--font-size-body, 14px); line-height: 1.5; color: var(--color-text-secondary, var(--color-muted-foreground)); }
  .g-panel { width: max-content; }
  .panel-body { display: flex; flex-direction: column; gap: 8px; padding: 8px; font-size: var(--font-size-body, 14px); }
  .panel-title { font-size: var(--font-size-label, 13px); }
  .panel-actions { justify-content: flex-end; gap: 8px; margin-top: 4px; }
  .tip-col { align-items: flex-start; gap: 6px; }
  /* Non-modal <dialog> (see the showModal shortcut): flow it inside the section instead of absolute-at-top. */
  :global(#cmp-Modal-open dialog[open]) { position: relative; }
  /* ContextMenu is viewport-fixed at x/y; pin it in flow so its box stays inside the section. */
  .ctx-host { position: relative; width: max-content; }
  :global(#cmp-ContextMenu-open .ctxm) { position: relative !important; left: 0 !important; top: 0 !important; }
  /* DraggableDialog is viewport-fixed too; same treatment. */
  :global(#cmp-DraggableDialog-open [data-scope='dialog'][data-part='positioner']) { position: relative !important; left: 0 !important; top: 0 !important; z-index: auto !important; }
  /* Zag pins the toast group to the viewport; keep it inside the section (items are absolute within it). */
  .g-toasts { position: relative !important; inset: auto !important; width: 380px; height: 300px; }
  .tabular { font-variant-numeric: tabular-nums; }
  .chart-box { width: 100%; max-width: 720px; }
  .spark { width: 200px; height: 48px; }
  .nav-tall { min-height: 360px; }
  .nav-rail { width: 56px; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 10px 0; border: 1px solid var(--color-border, #333); border-radius: 8px; }
  .rail-sep { width: 28px; height: 1px; margin: 6px 0; background: var(--hairline, var(--color-border)); }
  .skel-row { display: flex; align-items: center; gap: 12px; }
  .skel-lines { display: flex; flex-direction: column; gap: 8px; flex: 1; }
  .window-body p { margin: 0; }
</style>
