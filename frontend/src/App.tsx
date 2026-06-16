import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  AppBar,
  Box,
  Button,
  Chip,
  Container,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  ThemeProvider,
  Toolbar,
  Tooltip,
  Typography,
  createTheme,
} from '@mui/material'
import Grid from '@mui/material/Grid'
import {
  AccountTree,
  Add,
  AssignmentTurnedIn,
  FactCheck,
  PointOfSale,
  Refresh,
  Save,
  Security,
} from '@mui/icons-material'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

type Role = 'ADMIN' | 'OWNER' | 'AUTHORIZED_USER' | 'ACCOUNTANT' | 'CASHIER'
type IntakeStatus =
  | 'DRAFT'
  | 'PENDING_OWNER_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'PLANNED'
  | 'CASH_OPERATIONS_GENERATED'
type PlanStatus = 'CALCULATED' | 'ADJUSTED' | 'APPROVED'

type Dashboard = {
  intakes: number
  plans: number
  cashOperations: number
  registeredAmount: number
  generatedAmount: number
}

type FundBatch = {
  id: string
  sequenceNo: number
  amount: number
}

type FundIntake = {
  id: string
  amount: number
  source: string
  splitHours: number
  commissionRate: number
  registeredAt: string
  status: IntakeStatus
  ownerDecisionComment?: string
  batches: FundBatch[]
}

type Baseline = {
  restaurantId: string
  restaurantName: string
  city: string
  averageCheck: number
  dailyCustomerFlow: number
  seasonalCoefficient: number
  allowedDeviationPercent: number
}

type CreateRestaurant = {
  name: string
  city: string
  averageCheck: number
  dailyCustomerFlow: number
  seasonalCoefficient: number
  allowedDeviationPercent: number
}

type PlanItem = {
  id: string
  restaurantId: string
  restaurantName: string
  plannedAmount: number
  baselineCapacity: number
  deviationPercent: number
}

type DistributionPlan = {
  id: string
  intakeId: string
  createdAt: string
  status: PlanStatus
  totalAmount: number
  version: number
  items: PlanItem[]
}

type CashOperation = {
  id: string
  planId: string
  restaurantId: string
  restaurantName: string
  menuItem: string
  quantity: number
  unitPrice: number
  totalAmount: number
  operationTime: string
  status: string
}

type AuditEvent = {
  id: string
  occurredAt: string
  actorRole: Role
  action: string
  entityType: string
  entityId: string
  details: string
}

type TabKey = 'overview' | 'intakes' | 'baseline' | 'planning' | 'cash' | 'audit'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#205b4b' },
    secondary: { main: '#b3261e' },
    background: { default: '#f5f7f8', paper: '#ffffff' },
  },
  shape: { borderRadius: 6 },
  typography: {
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h5: { fontWeight: 750 },
    h6: { fontWeight: 720 },
    button: { textTransform: 'none', fontWeight: 700 },
  },
})

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const compactDate = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

function shortId(id: string) {
  return id.slice(0, 8)
}

function planLabel(plan: DistributionPlan) {
  return `${money.format(plan.totalAmount)} · v${plan.version} · ${compactDate.format(new Date(plan.createdAt))}`
}

function App() {
  const [role, setRole] = useState<Role>('OWNER')
  const [tab, setTab] = useState<TabKey>('overview')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [intakes, setIntakes] = useState<FundIntake[]>([])
  const [baselines, setBaselines] = useState<Baseline[]>([])
  const [plans, setPlans] = useState<DistributionPlan[]>([])
  const [cashOperations, setCashOperations] = useState<CashOperation[]>([])
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([])
  const [form, setForm] = useState({
    amount: '32000',
    source: 'Training synthetic source',
    splitHours: '72',
    commissionRate: '0.12',
  })

  const approvedIntakes = useMemo(
    () => intakes.filter((intake) => intake.status === 'APPROVED' || intake.status === 'PLANNED'),
    [intakes],
  )
  const approvedPlans = useMemo(
    () =>
      plans
        .filter((plan) => plan.status === 'APPROVED')
        .toSorted((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()),
    [plans],
  )

  async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Demo-Role': role,
        ...(options.headers ?? {}),
      },
    })
    if (!response.ok) {
      const body = await response.json().catch(() => null)
      throw new Error(body?.detail ?? body?.title ?? `HTTP ${response.status}`)
    }
    return response.json()
  }

  async function loadAll() {
    setLoading(true)
    setError('')
    try {
      const [dashboardData, intakeData, baselineData, planData, cashData, auditData] = await Promise.all([
        api<Dashboard>('/api/dashboard'),
        api<FundIntake[]>('/api/fund-intakes'),
        api<Baseline[]>('/api/restaurants/baselines'),
        api<DistributionPlan[]>('/api/distribution-plans'),
        api<CashOperation[]>('/api/cash-operations'),
        api<AuditEvent[]>('/api/audit-events'),
      ])
      setDashboard(dashboardData)
      setIntakes(intakeData)
      setBaselines(baselineData)
      setPlans(planData)
      setCashOperations(cashData)
      setAuditEvents(auditData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role])

  async function createIntake() {
    setLoading(true)
    setError('')
    try {
      await api<FundIntake>('/api/fund-intakes', {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(form.amount),
          source: form.source,
          splitHours: Number(form.splitHours),
          commissionRate: Number(form.commissionRate),
        }),
      })
      await loadAll()
      setTab('intakes')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error')
      setLoading(false)
    }
  }

  async function approveIntake(id: string) {
    await execute(() => api<FundIntake>(`/api/fund-intakes/${id}/approve`, { method: 'POST', body: '{}' }))
  }

  async function createPlan(intakeId: string) {
    await execute(() =>
      api<DistributionPlan>('/api/distribution-plans', {
        method: 'POST',
        body: JSON.stringify({ intakeId }),
      }),
    )
    setTab('planning')
  }

  async function approvePlan(id: string) {
    await execute(() => api<DistributionPlan>(`/api/distribution-plans/${id}/approve`, { method: 'POST', body: '{}' }))
  }

  async function generateCash(planId: string) {
    await execute(() =>
      api<CashOperation[]>('/api/cash-operations/generate', {
        method: 'POST',
        body: JSON.stringify({ planId }),
      }),
    )
    setTab('cash')
  }

  async function updateBaseline(restaurantId: string, baseline: Pick<Baseline, 'averageCheck' | 'dailyCustomerFlow' | 'seasonalCoefficient' | 'allowedDeviationPercent'>) {
    await execute(() =>
      api<Baseline>(`/api/restaurants/baselines/${restaurantId}`, {
        method: 'PATCH',
        body: JSON.stringify(baseline),
      }),
    )
    setTab('baseline')
  }

  async function createRestaurant(restaurant: CreateRestaurant) {
    await execute(() =>
      api<Baseline>('/api/restaurants/baselines', {
        method: 'POST',
        body: JSON.stringify(restaurant),
      }),
    )
    setTab('baseline')
  }

  async function execute(work: () => Promise<unknown>) {
    setLoading(true)
    setError('')
    try {
      await work()
      await loadAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error')
      setLoading(false)
    }
  }

  return (
    <ThemeProvider theme={theme}>
      <Box className="app-shell">
        <AppBar position="sticky" elevation={0} className="topbar">
          <Toolbar className="toolbar">
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Box className="brand-mark">
                <PointOfSale fontSize="small" />
              </Box>
              <Box>
                <Typography variant="h6">PollosFlow</Typography>
                <Typography variant="caption">Implementation MVP 0.5</Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <FormControl size="small" className="role-select">
                <InputLabel>Role</InputLabel>
                <Select label="Role" value={role} onChange={(event) => setRole(event.target.value as Role)}>
                  <MenuItem value="OWNER">Owner</MenuItem>
                  <MenuItem value="AUTHORIZED_USER">Authorized user</MenuItem>
                  <MenuItem value="ACCOUNTANT">Accountant</MenuItem>
                  <MenuItem value="CASHIER">Cashier</MenuItem>
                  <MenuItem value="ADMIN">Admin</MenuItem>
                </Select>
              </FormControl>
              <Tooltip title="Reload data">
                <Button variant="contained" startIcon={<Refresh />} onClick={loadAll}>
                  Refresh
                </Button>
              </Tooltip>
            </Stack>
          </Toolbar>
          {loading && <LinearProgress color="secondary" />}
        </AppBar>

        <Container maxWidth="xl" className="main">
          {error && (
            <Alert severity="error" onClose={() => setError('')} className="alert">
              {error}
            </Alert>
          )}

          <Paper className="tabs-panel" elevation={0}>
            <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" scrollButtons="auto">
              <Tab value="overview" icon={<FactCheck />} iconPosition="start" label="Overview" />
              <Tab value="intakes" icon={<Add />} iconPosition="start" label="Intakes" />
              <Tab value="baseline" icon={<AccountTree />} iconPosition="start" label="Baseline" />
              <Tab value="planning" icon={<AssignmentTurnedIn />} iconPosition="start" label="Planning" />
              <Tab value="cash" icon={<PointOfSale />} iconPosition="start" label="Cash ops" />
              <Tab value="audit" icon={<Security />} iconPosition="start" label="Audit" />
            </Tabs>
          </Paper>

          {tab === 'overview' && <Overview dashboard={dashboard} intakes={intakes} plans={plans} operations={cashOperations} />}
          {tab === 'intakes' && (
            <Intakes
              form={form}
              setForm={setForm}
              intakes={intakes}
              createIntake={createIntake}
              approveIntake={approveIntake}
              createPlan={createPlan}
            />
          )}
          {tab === 'baseline' && <BaselineTable baselines={baselines} createRestaurant={createRestaurant} updateBaseline={updateBaseline} />}
          {tab === 'planning' && (
            <Planning plans={plans} approvedIntakes={approvedIntakes} createPlan={createPlan} approvePlan={approvePlan} generateCash={generateCash} />
          )}
          {tab === 'cash' && <CashOperations operations={cashOperations} approvedPlans={approvedPlans} generateCash={generateCash} />}
          {tab === 'audit' && <Audit events={auditEvents} />}
        </Container>
      </Box>
    </ThemeProvider>
  )
}

function Overview({
  dashboard,
  intakes,
  plans,
  operations,
}: {
  dashboard: Dashboard | null
  intakes: FundIntake[]
  plans: DistributionPlan[]
  operations: CashOperation[]
}) {
  const latestIntake = intakes[0]
  const latestPlan = plans[0]
  return (
    <Stack spacing={2.5}>
      <Grid container spacing={2}>
        <Metric title="Registered" value={dashboard ? money.format(dashboard.registeredAmount) : '...'} />
        <Metric title="Generated ops" value={dashboard ? String(dashboard.cashOperations) : '...'} />
        <Metric title="Plans" value={dashboard ? String(dashboard.plans) : '...'} />
        <Metric title="Synthetic ready" value={dashboard ? money.format(dashboard.generatedAmount) : '...'} />
      </Grid>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper className="section" elevation={0}>
            <Typography variant="h6">Demo flow state</Typography>
            <Stack className="flow" direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
              <FlowStep label="Intake" status={latestIntake?.status ?? 'waiting'} />
              <FlowStep label="Plan" status={latestPlan?.status ?? 'waiting'} />
              <FlowStep label="Cash operations" status={operations.length > 0 ? 'READY_FOR_POS' : 'waiting'} />
            </Stack>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper className="section" elevation={0}>
            <Typography variant="h6">Architecture surface</Typography>
            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
              {['Java 17', 'Spring Boot', 'PostgreSQL', 'Flyway', 'REST', 'OpenAPI', 'React', 'MUI', 'MFE modules'].map((item) => (
                <Chip key={item} label={item} />
              ))}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Stack>
  )
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
      <Paper className="metric" elevation={0}>
        <Typography variant="body2">{title}</Typography>
        <Typography variant="h5">{value}</Typography>
      </Paper>
    </Grid>
  )
}

function FlowStep({ label, status }: { label: string; status: string }) {
  return (
    <Box className="flow-step">
      <Typography variant="body2">{label}</Typography>
      <StatusChip status={status} />
    </Box>
  )
}

function Intakes({
  form,
  setForm,
  intakes,
  createIntake,
  approveIntake,
  createPlan,
}: {
  form: { amount: string; source: string; splitHours: string; commissionRate: string }
  setForm: (next: { amount: string; source: string; splitHours: string; commissionRate: string }) => void
  intakes: FundIntake[]
  createIntake: () => void
  approveIntake: (id: string) => void
  createPlan: (id: string) => void
}) {
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, lg: 4 }}>
        <Paper className="section" elevation={0}>
          <Typography variant="h6">New intake</Typography>
          <Stack spacing={2}>
            <TextField label="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} type="number" />
            <TextField label="Source" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
            <TextField label="Split window, hours" value={form.splitHours} onChange={(e) => setForm({ ...form, splitHours: e.target.value })} type="number" />
            <TextField label="Commission rate" value={form.commissionRate} onChange={(e) => setForm({ ...form, commissionRate: e.target.value })} type="number" />
            <Button variant="contained" startIcon={<Add />} onClick={createIntake}>
              Register intake
            </Button>
          </Stack>
        </Paper>
      </Grid>
      <Grid size={{ xs: 12, lg: 8 }}>
        <Paper className="section" elevation={0}>
          <Typography variant="h6">Intake registry</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Amount</TableCell>
                  <TableCell>Source</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Batches</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {intakes.map((intake) => (
                  <TableRow key={intake.id}>
                    <TableCell>{money.format(intake.amount)}</TableCell>
                    <TableCell>{intake.source}</TableCell>
                    <TableCell>
                      <StatusChip status={intake.status} />
                    </TableCell>
                    <TableCell>{intake.batches.length}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                        <Button size="small" disabled={intake.status !== 'PENDING_OWNER_APPROVAL'} onClick={() => approveIntake(intake.id)}>
                          Approve
                        </Button>
                        <Button size="small" disabled={intake.status !== 'APPROVED'} onClick={() => createPlan(intake.id)}>
                          Plan
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Grid>
    </Grid>
  )
}

type BaselineDraft = {
  averageCheck: string
  dailyCustomerFlow: string
  seasonalCoefficient: string
  allowedDeviationPercent: string
}

function BaselineTable({
  baselines,
  createRestaurant,
  updateBaseline,
}: {
  baselines: Baseline[]
  createRestaurant: (restaurant: CreateRestaurant) => void
  updateBaseline: (
    restaurantId: string,
    baseline: Pick<Baseline, 'averageCheck' | 'dailyCustomerFlow' | 'seasonalCoefficient' | 'allowedDeviationPercent'>,
  ) => void
}) {
  const [drafts, setDrafts] = useState<Record<string, BaselineDraft>>({})
  const [newRestaurant, setNewRestaurant] = useState({
    name: '',
    city: '',
    averageCheck: '12.50',
    dailyCustomerFlow: '500',
    seasonalCoefficient: '1.00',
    allowedDeviationPercent: '35',
  })

  useEffect(() => {
    setDrafts(
      Object.fromEntries(
        baselines.map((baseline) => [
          baseline.restaurantId,
          {
            averageCheck: String(baseline.averageCheck),
            dailyCustomerFlow: String(baseline.dailyCustomerFlow),
            seasonalCoefficient: String(baseline.seasonalCoefficient),
            allowedDeviationPercent: String(baseline.allowedDeviationPercent),
          },
        ]),
      ),
    )
  }, [baselines])

  function changeDraft(restaurantId: string, field: keyof BaselineDraft, value: string) {
    setDrafts((current) => ({
      ...current,
      [restaurantId]: {
        ...current[restaurantId],
        [field]: value,
      },
    }))
  }

  return (
    <Stack spacing={2}>
      <Paper className="section" elevation={0}>
        <Typography variant="h6">Register restaurant</Typography>
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField fullWidth label="Restaurant" value={newRestaurant.name} onChange={(event) => setNewRestaurant({ ...newRestaurant, name: event.target.value })} />
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <TextField fullWidth label="City" value={newRestaurant.city} onChange={(event) => setNewRestaurant({ ...newRestaurant, city: event.target.value })} />
          </Grid>
          <Grid size={{ xs: 6, md: 1.5 }}>
            <TextField fullWidth label="Average check" type="number" value={newRestaurant.averageCheck} onChange={(event) => setNewRestaurant({ ...newRestaurant, averageCheck: event.target.value })} />
          </Grid>
          <Grid size={{ xs: 6, md: 1.5 }}>
            <TextField fullWidth label="Daily flow" type="number" value={newRestaurant.dailyCustomerFlow} onChange={(event) => setNewRestaurant({ ...newRestaurant, dailyCustomerFlow: event.target.value })} />
          </Grid>
          <Grid size={{ xs: 6, md: 1.5 }}>
            <TextField fullWidth label="Seasonality" type="number" value={newRestaurant.seasonalCoefficient} onChange={(event) => setNewRestaurant({ ...newRestaurant, seasonalCoefficient: event.target.value })} />
          </Grid>
          <Grid size={{ xs: 6, md: 1.5 }}>
            <TextField fullWidth label="Deviation" type="number" value={newRestaurant.allowedDeviationPercent} onChange={(event) => setNewRestaurant({ ...newRestaurant, allowedDeviationPercent: event.target.value })} />
          </Grid>
          <Grid size={{ xs: 12, md: 1 }}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<Add />}
              disabled={!newRestaurant.name.trim() || !newRestaurant.city.trim()}
              onClick={() => {
                createRestaurant({
                  name: newRestaurant.name,
                  city: newRestaurant.city,
                  averageCheck: Number(newRestaurant.averageCheck),
                  dailyCustomerFlow: Number(newRestaurant.dailyCustomerFlow),
                  seasonalCoefficient: Number(newRestaurant.seasonalCoefficient),
                  allowedDeviationPercent: Number(newRestaurant.allowedDeviationPercent),
                })
                setNewRestaurant({
                  name: '',
                  city: '',
                  averageCheck: '12.50',
                  dailyCustomerFlow: '500',
                  seasonalCoefficient: '1.00',
                  allowedDeviationPercent: '35',
                })
              }}
            >
              Add
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Paper className="section" elevation={0}>
        <Typography variant="h6">Restaurant baseline</Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Restaurant</TableCell>
                <TableCell>City</TableCell>
                <TableCell align="right">Average check</TableCell>
                <TableCell align="right">Daily flow</TableCell>
                <TableCell align="right">Seasonality</TableCell>
                <TableCell align="right">Allowed deviation</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {baselines.map((baseline) => {
                const draft = drafts[baseline.restaurantId]
                return (
                  <TableRow key={baseline.restaurantId}>
                    <TableCell>{baseline.restaurantName}</TableCell>
                    <TableCell>{baseline.city}</TableCell>
                    <TableCell align="right">
                      <TextField
                        size="small"
                        type="number"
                        value={draft?.averageCheck ?? ''}
                        onChange={(event) => changeDraft(baseline.restaurantId, 'averageCheck', event.target.value)}
                        slotProps={{ htmlInput: { min: 1, step: 0.01 } }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        size="small"
                        type="number"
                        value={draft?.dailyCustomerFlow ?? ''}
                        onChange={(event) => changeDraft(baseline.restaurantId, 'dailyCustomerFlow', event.target.value)}
                        slotProps={{ htmlInput: { min: 1, step: 1 } }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        size="small"
                        type="number"
                        value={draft?.seasonalCoefficient ?? ''}
                        onChange={(event) => changeDraft(baseline.restaurantId, 'seasonalCoefficient', event.target.value)}
                        slotProps={{ htmlInput: { min: 0.1, step: 0.01 } }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        size="small"
                        type="number"
                        value={draft?.allowedDeviationPercent ?? ''}
                        onChange={(event) => changeDraft(baseline.restaurantId, 'allowedDeviationPercent', event.target.value)}
                        slotProps={{ htmlInput: { min: 0, max: 100, step: 0.1 } }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<Save />}
                        disabled={!draft}
                        onClick={() =>
                          draft &&
                          updateBaseline(baseline.restaurantId, {
                            averageCheck: Number(draft.averageCheck),
                            dailyCustomerFlow: Number(draft.dailyCustomerFlow),
                            seasonalCoefficient: Number(draft.seasonalCoefficient),
                            allowedDeviationPercent: Number(draft.allowedDeviationPercent),
                          })
                        }
                      >
                        Save
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Stack>
  )
}

function Planning({
  plans,
  approvedIntakes,
  createPlan,
  approvePlan,
  generateCash,
}: {
  plans: DistributionPlan[]
  approvedIntakes: FundIntake[]
  createPlan: (id: string) => void
  approvePlan: (id: string) => void
  generateCash: (id: string) => void
}) {
  return (
    <Stack spacing={2}>
      <Paper className="section" elevation={0}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ justifyContent: 'space-between' }}>
          <Typography variant="h6">Distribution plans</Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            {approvedIntakes.slice(0, 3).map((intake) => (
              <Button key={intake.id} variant="outlined" size="small" onClick={() => createPlan(intake.id)}>
                Create for {money.format(intake.amount)}
              </Button>
            ))}
          </Stack>
        </Stack>
      </Paper>
      {plans.map((plan) => (
        <Paper className="section" key={plan.id} elevation={0}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ justifyContent: 'space-between' }}>
            <Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Typography variant="h6">Plan v{plan.version}</Typography>
                <StatusChip status={plan.status} />
              </Stack>
              <Typography variant="body2">{money.format(plan.totalAmount)} · {compactDate.format(new Date(plan.createdAt))}</Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button size="small" disabled={plan.status === 'APPROVED'} onClick={() => approvePlan(plan.id)}>
                Approve
              </Button>
              <Button size="small" variant="contained" disabled={plan.status !== 'APPROVED'} onClick={() => generateCash(plan.id)}>
                Generate ops
              </Button>
            </Stack>
          </Stack>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Restaurant</TableCell>
                  <TableCell align="right">Planned</TableCell>
                  <TableCell align="right">Baseline capacity</TableCell>
                  <TableCell align="right">Deviation</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {plan.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.restaurantName}</TableCell>
                    <TableCell align="right">{money.format(item.plannedAmount)}</TableCell>
                    <TableCell align="right">{money.format(item.baselineCapacity)}</TableCell>
                    <TableCell align="right">{item.deviationPercent}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      ))}
    </Stack>
  )
}

function CashOperations({
  operations,
  approvedPlans,
  generateCash,
}: {
  operations: CashOperation[]
  approvedPlans: DistributionPlan[]
  generateCash: (id: string) => void
}) {
  return (
    <Paper className="section" elevation={0}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ justifyContent: 'space-between' }}>
        <Typography variant="h6">Generated cash operations</Typography>
        <Box className="cash-plan-scroll">
          <Stack direction="row" spacing={1} className="cash-plan-track">
            {approvedPlans.map((plan) => (
              <Tooltip key={plan.id} title={`Plan ${shortId(plan.id)} for intake ${shortId(plan.intakeId)}`}>
                <Button size="small" variant="outlined" className="cash-plan-button" onClick={() => generateCash(plan.id)}>
                  Generate: {planLabel(plan)}
                </Button>
              </Tooltip>
            ))}
          </Stack>
        </Box>
      </Stack>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Time</TableCell>
              <TableCell>Restaurant</TableCell>
              <TableCell>Menu item</TableCell>
              <TableCell align="right">Qty</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {operations.map((operation) => (
              <TableRow key={operation.id}>
                <TableCell>{compactDate.format(new Date(operation.operationTime))}</TableCell>
                <TableCell>{operation.restaurantName}</TableCell>
                <TableCell>{operation.menuItem}</TableCell>
                <TableCell align="right">{operation.quantity}</TableCell>
                <TableCell align="right">{money.format(operation.totalAmount)}</TableCell>
                <TableCell>
                  <StatusChip status={operation.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  )
}

function Audit({ events }: { events: AuditEvent[] }) {
  return (
    <Paper className="section" elevation={0}>
      <Typography variant="h6">Audit journal</Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Time</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Entity</TableCell>
              <TableCell>Details</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.id}>
                <TableCell>{compactDate.format(new Date(event.occurredAt))}</TableCell>
                <TableCell>{event.actorRole}</TableCell>
                <TableCell>{event.action}</TableCell>
                <TableCell>{event.entityType}</TableCell>
                <TableCell>{event.details}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  )
}

function StatusChip({ status }: { status: string }) {
  const color =
    status === 'APPROVED' || status === 'READY_FOR_POS'
      ? 'success'
      : status === 'REJECTED'
        ? 'error'
        : status === 'waiting'
          ? 'default'
          : 'warning'
  return <Chip size="small" color={color} label={status.replaceAll('_', ' ')} />
}

export default App
