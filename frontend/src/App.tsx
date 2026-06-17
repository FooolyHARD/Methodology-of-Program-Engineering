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
  Logout,
  PersonAdd,
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

type AuthUser = {
  username: string
  role: Role
}

type AppAccount = {
  id: string
  username: string
  role: Role
  enabled: boolean
  createdAt: string
}

type TabKey = 'overview' | 'intakes' | 'baseline' | 'planning' | 'cash' | 'audit' | 'users'

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

function canCreateIntake(role: Role) {
  return role === 'AUTHORIZED_USER' || role === 'OWNER' || role === 'ADMIN'
}

function canManageWorkflow(role: Role) {
  return role === 'OWNER' || role === 'ADMIN'
}

function canManageUsers(role: Role) {
  return role === 'OWNER'
}

function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [tab, setTab] = useState<TabKey>('overview')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [intakes, setIntakes] = useState<FundIntake[]>([])
  const [baselines, setBaselines] = useState<Baseline[]>([])
  const [plans, setPlans] = useState<DistributionPlan[]>([])
  const [cashOperations, setCashOperations] = useState<CashOperation[]>([])
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([])
  const [accounts, setAccounts] = useState<AppAccount[]>([])
  const [loginForm, setLoginForm] = useState({ username: 'owner', password: 'owner123' })
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
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
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
    if (!currentUser) {
      return
    }
    setLoading(true)
    setError('')
    try {
      const [dashboardData, intakeData, baselineData, planData, cashData, auditData, accountData] = await Promise.all([
        api<Dashboard>('/api/dashboard'),
        api<FundIntake[]>('/api/fund-intakes'),
        api<Baseline[]>('/api/restaurants/baselines'),
        api<DistributionPlan[]>('/api/distribution-plans'),
        api<CashOperation[]>('/api/cash-operations'),
        api<AuditEvent[]>('/api/audit-events'),
        canManageUsers(currentUser.role) ? api<AppAccount[]>('/api/users') : Promise.resolve([]),
      ])
      setDashboard(dashboardData)
      setIntakes(intakeData)
      setBaselines(baselineData)
      setPlans(planData)
      setCashOperations(cashData)
      setAuditEvents(auditData)
      setAccounts(accountData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    api<AuthUser>('/api/auth/me')
      .then(setCurrentUser)
      .catch(() => setCurrentUser(null))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (currentUser) {
      loadAll()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser])

  useEffect(() => {
    if (currentUser && tab === 'users' && !canManageUsers(currentUser.role)) {
      setTab('overview')
    }
  }, [currentUser, tab])

  async function login() {
    setLoading(true)
    setError('')
    try {
      const user = await api<AuthUser>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(loginForm),
      })
      setCurrentUser(user)
      setTab('overview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error')
      setLoading(false)
    }
  }

  async function logout() {
    await fetch(`${API_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' })
    setCurrentUser(null)
    setDashboard(null)
    setIntakes([])
    setBaselines([])
    setPlans([])
    setCashOperations([])
    setAuditEvents([])
    setAccounts([])
    setTab('overview')
  }

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

  async function createAccount(account: { username: string; password: string; role: Role }) {
    await execute(() =>
      api<AppAccount>('/api/users', {
        method: 'POST',
        body: JSON.stringify({ ...account, username: account.username.trim() }),
      }),
    )
    setTab('users')
  }

  async function setAccountEnabled(account: AppAccount, enabled: boolean) {
    await execute(() =>
      api<AppAccount>(`/api/users/${account.id}/${enabled ? 'enable' : 'disable'}`, {
        method: 'POST',
        body: '{}',
      }),
    )
    setTab('users')
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

  if (!currentUser) {
    return (
      <ThemeProvider theme={theme}>
        <LoginScreen
          error={error}
          loading={loading}
          form={loginForm}
          setForm={setLoginForm}
          login={login}
        />
      </ThemeProvider>
    )
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
              <Chip label={`${currentUser.username} · ${currentUser.role}`} />
              <Tooltip title="Reload data">
                <Button variant="contained" startIcon={<Refresh />} onClick={loadAll}>
                  Refresh
                </Button>
              </Tooltip>
              <Tooltip title="Sign out">
                <Button variant="outlined" startIcon={<Logout />} onClick={logout}>
                  Logout
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
              {canManageUsers(currentUser.role) && <Tab value="users" icon={<PersonAdd />} iconPosition="start" label="Users" />}
            </Tabs>
          </Paper>

          {tab === 'overview' && <Overview dashboard={dashboard} intakes={intakes} plans={plans} operations={cashOperations} />}
          {tab === 'intakes' && (
            <Intakes
              form={form}
              setForm={setForm}
              intakes={intakes}
              currentRole={currentUser.role}
              createIntake={createIntake}
              approveIntake={approveIntake}
              createPlan={createPlan}
            />
          )}
          {tab === 'baseline' && (
            <BaselineTable
              baselines={baselines}
              currentRole={currentUser.role}
              createRestaurant={createRestaurant}
              updateBaseline={updateBaseline}
            />
          )}
          {tab === 'planning' && (
            <Planning
              plans={plans}
              approvedIntakes={approvedIntakes}
              currentRole={currentUser.role}
              createPlan={createPlan}
              approvePlan={approvePlan}
              generateCash={generateCash}
            />
          )}
          {tab === 'cash' && (
            <CashOperations
              operations={cashOperations}
              approvedPlans={approvedPlans}
              currentRole={currentUser.role}
              generateCash={generateCash}
            />
          )}
          {tab === 'audit' && <Audit events={auditEvents} />}
          {tab === 'users' && canManageUsers(currentUser.role) && (
            <Users
              accounts={accounts}
              currentUsername={currentUser.username}
              createAccount={createAccount}
              setAccountEnabled={setAccountEnabled}
            />
          )}
        </Container>
      </Box>
    </ThemeProvider>
  )
}

function LoginScreen({
  error,
  loading,
  form,
  setForm,
  login,
}: {
  error: string
  loading: boolean
  form: { username: string; password: string }
  setForm: (form: { username: string; password: string }) => void
  login: () => void
}) {
  return (
    <Box className="login-shell">
      <Paper className="login-panel" elevation={0}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Box className="brand-mark">
              <PointOfSale fontSize="small" />
            </Box>
            <Box>
              <Typography variant="h5">PollosFlow</Typography>
              <Typography variant="body2">Secure operations console</Typography>
            </Box>
          </Stack>
          {error && <Alert severity="error">{error}</Alert>}
          {loading && <LinearProgress color="secondary" />}
          <TextField label="Username" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} />
          <TextField
            label="Password"
            type="password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                login()
              }
            }}
          />
          <Button variant="contained" onClick={login} disabled={!form.username || !form.password || loading}>
            Login
          </Button>
        </Stack>
      </Paper>
    </Box>
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
  currentRole,
  createIntake,
  approveIntake,
  createPlan,
}: {
  form: { amount: string; source: string; splitHours: string; commissionRate: string }
  setForm: (next: { amount: string; source: string; splitHours: string; commissionRate: string }) => void
  intakes: FundIntake[]
  currentRole: Role
  createIntake: () => void
  approveIntake: (id: string) => void
  createPlan: (id: string) => void
}) {
  const intakeCreationAvailable = canCreateIntake(currentRole)
  const workflowManagementAvailable = canManageWorkflow(currentRole)

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, lg: 4 }}>
        <Paper className="section" elevation={0}>
          <Typography variant="h6">New intake</Typography>
          <Stack spacing={2}>
            {!intakeCreationAvailable && <Alert severity="info">Intake registration is not available for this role.</Alert>}
            <TextField disabled={!intakeCreationAvailable} label="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} type="number" />
            <TextField disabled={!intakeCreationAvailable} label="Source" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
            <TextField disabled={!intakeCreationAvailable} label="Split window, hours" value={form.splitHours} onChange={(e) => setForm({ ...form, splitHours: e.target.value })} type="number" />
            <TextField disabled={!intakeCreationAvailable} label="Commission rate" value={form.commissionRate} onChange={(e) => setForm({ ...form, commissionRate: e.target.value })} type="number" />
            <Button variant="contained" startIcon={<Add />} disabled={!intakeCreationAvailable} onClick={createIntake}>
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
                        <Button size="small" disabled={!workflowManagementAvailable || intake.status !== 'PENDING_OWNER_APPROVAL'} onClick={() => approveIntake(intake.id)}>
                          Approve
                        </Button>
                        <Button size="small" disabled={!workflowManagementAvailable || intake.status !== 'APPROVED'} onClick={() => createPlan(intake.id)}>
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
  currentRole,
  createRestaurant,
  updateBaseline,
}: {
  baselines: Baseline[]
  currentRole: Role
  createRestaurant: (restaurant: CreateRestaurant) => void
  updateBaseline: (
    restaurantId: string,
    baseline: Pick<Baseline, 'averageCheck' | 'dailyCustomerFlow' | 'seasonalCoefficient' | 'allowedDeviationPercent'>,
  ) => void
}) {
  const [drafts, setDrafts] = useState<Record<string, BaselineDraft>>({})
  const baselineManagementAvailable = canManageWorkflow(currentRole)
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
        {!baselineManagementAvailable && <Alert severity="info" className="inline-alert">Restaurant registration is not available for this role.</Alert>}
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField disabled={!baselineManagementAvailable} fullWidth label="Restaurant" value={newRestaurant.name} onChange={(event) => setNewRestaurant({ ...newRestaurant, name: event.target.value })} />
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <TextField disabled={!baselineManagementAvailable} fullWidth label="City" value={newRestaurant.city} onChange={(event) => setNewRestaurant({ ...newRestaurant, city: event.target.value })} />
          </Grid>
          <Grid size={{ xs: 6, md: 1.5 }}>
            <TextField disabled={!baselineManagementAvailable} fullWidth label="Average check" type="number" value={newRestaurant.averageCheck} onChange={(event) => setNewRestaurant({ ...newRestaurant, averageCheck: event.target.value })} />
          </Grid>
          <Grid size={{ xs: 6, md: 1.5 }}>
            <TextField disabled={!baselineManagementAvailable} fullWidth label="Daily flow" type="number" value={newRestaurant.dailyCustomerFlow} onChange={(event) => setNewRestaurant({ ...newRestaurant, dailyCustomerFlow: event.target.value })} />
          </Grid>
          <Grid size={{ xs: 6, md: 1.5 }}>
            <TextField disabled={!baselineManagementAvailable} fullWidth label="Seasonality" type="number" value={newRestaurant.seasonalCoefficient} onChange={(event) => setNewRestaurant({ ...newRestaurant, seasonalCoefficient: event.target.value })} />
          </Grid>
          <Grid size={{ xs: 6, md: 1.5 }}>
            <TextField disabled={!baselineManagementAvailable} fullWidth label="Deviation" type="number" value={newRestaurant.allowedDeviationPercent} onChange={(event) => setNewRestaurant({ ...newRestaurant, allowedDeviationPercent: event.target.value })} />
          </Grid>
          <Grid size={{ xs: 12, md: 1 }}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<Add />}
              disabled={!baselineManagementAvailable || !newRestaurant.name.trim() || !newRestaurant.city.trim()}
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
                        disabled={!baselineManagementAvailable}
                        type="number"
                        value={draft?.averageCheck ?? ''}
                        onChange={(event) => changeDraft(baseline.restaurantId, 'averageCheck', event.target.value)}
                        slotProps={{ htmlInput: { min: 1, step: 0.01 } }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        size="small"
                        disabled={!baselineManagementAvailable}
                        type="number"
                        value={draft?.dailyCustomerFlow ?? ''}
                        onChange={(event) => changeDraft(baseline.restaurantId, 'dailyCustomerFlow', event.target.value)}
                        slotProps={{ htmlInput: { min: 1, step: 1 } }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        size="small"
                        disabled={!baselineManagementAvailable}
                        type="number"
                        value={draft?.seasonalCoefficient ?? ''}
                        onChange={(event) => changeDraft(baseline.restaurantId, 'seasonalCoefficient', event.target.value)}
                        slotProps={{ htmlInput: { min: 0.1, step: 0.01 } }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        size="small"
                        disabled={!baselineManagementAvailable}
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
                        disabled={!baselineManagementAvailable || !draft}
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
  currentRole,
  createPlan,
  approvePlan,
  generateCash,
}: {
  plans: DistributionPlan[]
  approvedIntakes: FundIntake[]
  currentRole: Role
  createPlan: (id: string) => void
  approvePlan: (id: string) => void
  generateCash: (id: string) => void
}) {
  const workflowManagementAvailable = canManageWorkflow(currentRole)

  return (
    <Stack spacing={2}>
      <Paper className="section" elevation={0}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ justifyContent: 'space-between' }}>
          <Typography variant="h6">Distribution plans</Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            {approvedIntakes.slice(0, 3).map((intake) => (
              <Button key={intake.id} variant="outlined" size="small" disabled={!workflowManagementAvailable} onClick={() => createPlan(intake.id)}>
                Create for {money.format(intake.amount)}
              </Button>
            ))}
          </Stack>
        </Stack>
        {!workflowManagementAvailable && <Alert severity="info" className="inline-alert">Plan creation and approval are not available for this role.</Alert>}
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
              <Button size="small" disabled={!workflowManagementAvailable || plan.status === 'APPROVED'} onClick={() => approvePlan(plan.id)}>
                Approve
              </Button>
              <Button size="small" variant="contained" disabled={!workflowManagementAvailable || plan.status !== 'APPROVED'} onClick={() => generateCash(plan.id)}>
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
  currentRole,
  generateCash,
}: {
  operations: CashOperation[]
  approvedPlans: DistributionPlan[]
  currentRole: Role
  generateCash: (id: string) => void
}) {
  const cashGenerationAvailable = canManageWorkflow(currentRole)

  return (
    <Paper className="section" elevation={0}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ justifyContent: 'space-between' }}>
        <Typography variant="h6">Generated cash operations</Typography>
        <Box className="cash-plan-scroll">
          <Stack direction="row" spacing={1} className="cash-plan-track">
            {approvedPlans.map((plan) => (
              <Tooltip key={plan.id} title={`Plan ${shortId(plan.id)} for intake ${shortId(plan.intakeId)}`}>
                <span>
                  <Button
                    size="small"
                    variant="outlined"
                    className="cash-plan-button"
                    disabled={!cashGenerationAvailable}
                    onClick={() => generateCash(plan.id)}
                  >
                  Generate: {planLabel(plan)}
                  </Button>
                </span>
              </Tooltip>
            ))}
          </Stack>
        </Box>
      </Stack>
      {!cashGenerationAvailable && <Alert severity="info" className="inline-alert">Cash operation generation is not available for this role.</Alert>}
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

function Users({
  accounts,
  currentUsername,
  createAccount,
  setAccountEnabled,
}: {
  accounts: AppAccount[]
  currentUsername: string
  createAccount: (account: { username: string; password: string; role: Role }) => void
  setAccountEnabled: (account: AppAccount, enabled: boolean) => void
}) {
  const [form, setForm] = useState({ username: '', password: '', role: 'AUTHORIZED_USER' as Role })
  const usernameOk = form.username.trim().length >= 3
  const passwordOk = form.password.length >= 8
  const canCreate = usernameOk && passwordOk

  return (
    <Stack spacing={2}>
      <Paper className="section" elevation={0}>
        <Typography variant="h6">Create account</Typography>
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth
              label="Username"
              value={form.username}
              error={form.username.length > 0 && !usernameOk}
              helperText={form.username.length > 0 && !usernameOk ? 'At least 3 characters' : ' '}
              onChange={(event) => setForm({ ...form, username: event.target.value })}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth
              label="Temporary password"
              type="password"
              value={form.password}
              error={form.password.length > 0 && !passwordOk}
              helperText={form.password.length > 0 && !passwordOk ? 'At least 8 characters' : ' '}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select label="Role" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as Role })}>
                <MenuItem value="AUTHORIZED_USER">Authorized user</MenuItem>
                <MenuItem value="ACCOUNTANT">Accountant</MenuItem>
                <MenuItem value="CASHIER">Cashier</MenuItem>
                <MenuItem value="ADMIN">Admin</MenuItem>
                <MenuItem value="OWNER">Owner</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<PersonAdd />}
              disabled={!canCreate}
              onClick={() => {
                createAccount({ ...form, username: form.username.trim() })
                setForm({ username: '', password: '', role: 'AUTHORIZED_USER' })
              }}
            >
              Create
            </Button>
          </Grid>
        </Grid>
      </Paper>
      <Paper className="section" elevation={0}>
        <Typography variant="h6">Accounts</Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Username</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell>{account.username}</TableCell>
                  <TableCell>{account.role}</TableCell>
                  <TableCell>
                    <StatusChip status={account.enabled ? 'ENABLED' : 'DISABLED'} />
                  </TableCell>
                  <TableCell>{compactDate.format(new Date(account.createdAt))}</TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant={account.enabled ? 'outlined' : 'contained'}
                      color={account.enabled ? 'secondary' : 'primary'}
                      disabled={account.username.toLowerCase() === currentUsername.toLowerCase()}
                      onClick={() => setAccountEnabled(account, !account.enabled)}
                    >
                      {account.enabled ? 'Disable' : 'Enable'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Stack>
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
