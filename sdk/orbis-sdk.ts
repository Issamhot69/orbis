/**
 * ORBIS SDK v1.0.0
 * One platform. Every business. Everywhere.
 * https://orbis-smoky-gamma.vercel.app
 */

export interface OrbisConfig {
  apiUrl?: string
  token?: string
}

export interface OrbisUser {
  id: string
  email: string
  firstName: string
  lastName: string
  isVerified: boolean
  createdAt: string
}

export interface OrbisOrganization {
  id: string
  name: string
  description?: string
  industry?: string
  website?: string
}

export interface OrbisListing {
  id: string
  title: string
  description: string
  type: 'service' | 'product' | 'expertise' | 'partnership'
  price: number
  currency: string
  priceType: 'fixed' | 'hourly' | 'monthly' | 'custom'
}

export class OrbisSDK {
  private apiUrl: string
  private token: string | null = null

  constructor(config: OrbisConfig = {}) {
    this.apiUrl = config.apiUrl || 'https://orbis-production-6ad0.up.railway.app'
    this.token  = config.token || null
  }

  private async request(method: string, path: string, body?: any): Promise<any> {
    const headers: any = { 'Content-Type': 'application/json' }
    if (this.token) headers['Authorization'] = 'Bearer ' + this.token

    const res = await fetch(this.apiUrl + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'ORBIS API Error')
    return data
  }

  // ─── Auth ─────────────────────────────────────
  async register(email: string, password: string, firstName: string, lastName: string) {
    const data = await this.request('POST', '/api/auth/register', { email, password, firstName, lastName })
    this.token = data.token
    return data
  }

  async login(email: string, password: string) {
    const data = await this.request('POST', '/api/auth/login', { email, password })
    this.token = data.token
    return data
  }

  async getProfile(): Promise<{ user: OrbisUser }> {
    return this.request('GET', '/api/auth/me')
  }

  async updateProfile(data: { firstName?: string, lastName?: string, avatarUrl?: string }) {
    return this.request('PATCH', '/api/auth/me', data)
  }

  async forgotPassword(email: string) {
    return this.request('POST', '/api/auth/forgot-password', { email })
  }

  setToken(token: string) {
    this.token = token
  }

  getToken(): string | null {
    return this.token
  }

  // ─── Organizations ────────────────────────────
  async getOrganizations(): Promise<{ organizations: OrbisOrganization[] }> {
    return this.request('GET', '/api/organizations')
  }

  async createOrganization(data: { name: string, description?: string, industry?: string, website?: string }) {
    return this.request('POST', '/api/organizations', data)
  }

  // ─── Projects ────────────────────────────────
  async getProjects() {
    return this.request('GET', '/api/projects')
  }

  async createProject(data: { name: string, description?: string, orgId?: string }) {
    return this.request('POST', '/api/projects', data)
  }

  async getTasks(projectId: string) {
    return this.request('GET', `/api/projects/${projectId}/tasks`)
  }

  async createTask(projectId: string, data: { title: string, description?: string, priority?: string }) {
    return this.request('POST', `/api/projects/${projectId}/tasks`, data)
  }

  // ─── Marketplace ─────────────────────────────
  async getListings(params?: { search?: string, categoryId?: string, type?: string }): Promise<{ listings: OrbisListing[] }> {
    let url = '/api/marketplace/listings?'
    if (params?.search)     url += 'search=' + params.search + '&'
    if (params?.categoryId) url += 'categoryId=' + params.categoryId + '&'
    if (params?.type)       url += 'type=' + params.type
    return this.request('GET', url)
  }

  async createListing(data: Partial<OrbisListing> & { title: string, description: string }) {
    return this.request('POST', '/api/marketplace/listings', data)
  }

  // ─── Messages ────────────────────────────────
  async getChannels() {
    return this.request('GET', '/api/messaging')
  }

  async sendMessage(channelId: string, content: string) {
    return this.request('POST', `/api/messaging/${channelId}/messages`, { content })
  }

  // ─── Contracts ───────────────────────────────
  async getContracts() {
    return this.request('GET', '/api/contracts')
  }

  async createContract(data: { title: string, content: string, parties: string[] }) {
    return this.request('POST', '/api/contracts', data)
  }

  // ─── Payments ────────────────────────────────
  async getPayments() {
    return this.request('GET', '/api/payments')
  }

  async getPlans() {
    return this.request('GET', '/api/stripe/plans')
  }

  async checkout(planId: 'pro' | 'enterprise') {
    return this.request('POST', '/api/stripe/checkout', { planId })
  }

  // ─── Trust Passport ───────────────────────────
  async getTrustScore() {
    return this.request('GET', '/api/trust')
  }

  // ─── AI Assistant ────────────────────────────
  async askAI(message: string, context?: string) {
    return this.request('POST', '/api/ai', { message, context })
  }

  // ─── Memory ──────────────────────────────────
  async getMemory() {
    return this.request('GET', '/api/memory')
  }

  async addMemory(content: string, category?: string) {
    return this.request('POST', '/api/memory', { content, category })
  }

  // ─── Opportunities ────────────────────────────
  async getOpportunities() {
    return this.request('GET', '/api/opportunity')
  }

  // ─── Health ──────────────────────────────────
  async health() {
    return this.request('GET', '/health')
  }
}

// ─── Default export ───────────────────────────
export default OrbisSDK

// ─── Usage example ────────────────────────────
/*
import OrbisSDK from './orbis-sdk'

const orbis = new OrbisSDK()

// Login
const { token, user } = await orbis.login('admin@orbis.com', 'secret123')
console.log('Logged in as:', user.firstName)

// Get organizations
const { organizations } = await orbis.getOrganizations()
console.log('Organizations:', organizations)

// Search marketplace
const { listings } = await orbis.getListings({ search: 'AI', type: 'service' })
console.log('Listings:', listings)

// Ask AI
const response = await orbis.askAI('What are the best B2B opportunities in tech?')
console.log('AI says:', response)
*/
