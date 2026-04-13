"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Building2,
  Check,
  ChevronRight,
  Cpu,
  Globe,
  Headphones,
  Mail,
  MessageSquare,
  Phone,
  Send,
  Sparkles,
  Users,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"

const ACCOMPANIMENT_LEVELS = [
  "Autonome (documentation seule)",
  "Accompagnement standard (support email)",
  "Accompagnement renforcé (support prioritaire + formations)",
  "Accompagnement dédié (CSM dédié + SLA personnalisé)",
  "Partenariat stratégique (intégration approfondie)",
]

const EMPLOYEE_RANGES = ["100–200", "200–500", "500–1 000", "1 000–5 000", "5 000+"]
const DEVICE_RANGES = ["15–30", "30–100", "100–300", "300–1 000", "1 000+"]
const SITE_RANGES = ["2–5", "5–15", "15–50", "50–200", "200+"]

interface FormData {
  companyName: string
  employeeRange: string
  deviceRange: string
  siteRange: string
  specificNeeds: string
  accompaniment: string
  contactName: string
  email: string
  phone: string
  message: string
}

const EMPTY_FORM: FormData = {
  companyName: "",
  employeeRange: "",
  deviceRange: "",
  siteRange: "",
  specificNeeds: "",
  accompaniment: "",
  contactName: "",
  email: "",
  phone: "",
  message: "",
}

const FEATURES = [
  { icon: Users, label: "Volume d'employés sur mesure", description: "Au-delà de 100 employés" },
  { icon: Cpu, label: "Infrastructure étendue", description: "Appareils & portes illimités" },
  { icon: Globe, label: "Multi-sites avancé", description: "Déploiement international" },
  { icon: Zap, label: "API & intégrations", description: "Webhooks, SSO, ERP" },
  { icon: Headphones, label: "Support dédié", description: "CSM + SLA personnalisé" },
  { icon: Sparkles, label: "Personnalisation", description: "Branding & workflows" },
]

export function BillingCustomOffer() {
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<FormData>>({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  function set(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  function validate(): Partial<FormData> {
    const e: Partial<FormData> = {}
    if (!form.companyName.trim()) e.companyName = "Requis"
    if (!form.employeeRange) e.employeeRange = "Requis"
    if (!form.contactName.trim()) e.contactName = "Requis"
    if (!form.email.trim()) e.email = "Requis"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Email invalide"
    if (!form.message.trim()) e.message = "Requis"
    return e
  }

  function handleSubmit() {
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length) return
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setSuccess(true)
    }, 1600)
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 rounded-2xl border border-success/30 bg-success/5 py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-success/30 bg-success/15">
          <Check className="h-8 w-8 text-success" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-success">Demande envoyée avec succès !</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Notre équipe commerciale analysera votre demande et vous contactera sous <strong>48 heures ouvrées</strong> avec une proposition personnalisée.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 justify-center">
          <Button variant="outline" onClick={() => { setSuccess(false); setForm(EMPTY_FORM) }} className="gap-2">
            <Send className="h-3.5 w-3.5" />
            Nouvelle demande
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-400/30 bg-linear-to-br from-amber-50/80 via-orange-50/50 to-background dark:from-amber-950/30 dark:via-orange-950/20 dark:to-background p-6 md:p-8">
        <div className="pointer-events-none absolute right-0 top-0 opacity-[0.06]">
          <Building2 className="h-64 w-64 text-amber-500" />
        </div>
        <div className="relative space-y-3 max-w-2xl">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-amber-500" />
            <span className="text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
              Offre Enterprise sur mesure
            </span>
          </div>
          <h1 className="text-2xl font-extrabold md:text-3xl">
            Des besoins au-delà du plan Enterprise ?
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Pour les organisations dépassant les capacités standard — plus de 100 employés, des dizaines d'appareils, plusieurs sites ou des exigences d'intégration avancées — nous établissons une proposition tarifaire entièrement personnalisée.
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {["Facture personnalisée", "SLA dédié", "Intégrations sur mesure", "Accompagnement premium"].map((tag) => (
              <span key={tag} className="flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                <Check className="h-3 w-3" />
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Features grid ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {FEATURES.map((f) => {
          const FIcon = f.icon
          return (
            <div key={f.label} className="flex flex-col gap-2.5 overflow-hidden rounded-xl border bg-card p-4 hover:shadow-sm transition-shadow">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
                <FIcon className="h-4.5 w-4.5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-semibold">{f.label}</p>
                <p className="text-xs text-muted-foreground">{f.description}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Processus ── */}
      <div className="overflow-hidden rounded-2xl border bg-card p-5">
        <h3 className="mb-4 font-semibold text-sm">Comment ça fonctionne ?</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { num: "01", title: "Envoi de votre demande", desc: "Remplissez le formulaire ci-dessous avec vos besoins estimés." },
            { num: "02", title: "Analyse & proposition", desc: "Notre équipe vous contacte sous 48h avec une offre personnalisée." },
            { num: "03", title: "Déploiement sur mesure", desc: "Nous configurons la plateforme selon vos spécifications exactes." },
          ].map((step, i) => (
            <div key={step.num} className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-sm font-bold text-amber-600 dark:text-amber-400">
                {step.num}
              </div>
              <div>
                <p className="font-semibold text-sm">{step.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
              </div>
              {i < 2 && <ChevronRight className="hidden sm:block mt-1.5 h-4 w-4 shrink-0 text-muted-foreground/30" />}
            </div>
          ))}
        </div>
      </div>

      {/* ── Formulaire ── */}
      <div className="overflow-hidden rounded-2xl border bg-card p-6 space-y-5">
        <div className="flex items-center gap-2 pb-1 border-b border-border/60">
          <MessageSquare className="h-4.5 w-4.5 text-primary" />
          <h3 className="font-bold text-base">Formulaire de demande sur mesure</h3>
        </div>

        {/* Section : Entreprise */}
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Informations de l'entreprise</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nom de l'entreprise <span className="text-destructive">*</span></Label>
              <Input placeholder="Entreprise SA" value={form.companyName} onChange={(e) => set("companyName", e.target.value)} className={errors.companyName ? "border-destructive" : ""} />
              {errors.companyName && <p className="text-xs text-destructive">{errors.companyName}</p>}
            </div>
            <div className="space-y-2">
              <Label>Estimation d'employés <span className="text-destructive">*</span></Label>
              <Select value={form.employeeRange} onValueChange={(v) => set("employeeRange", v)}>
                <SelectTrigger className={errors.employeeRange ? "border-destructive" : ""}>
                  <SelectValue placeholder="Choisir une fourchette…" />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYEE_RANGES.map((r) => <SelectItem key={r} value={r}>{r} employés</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.employeeRange && <p className="text-xs text-destructive">{errors.employeeRange}</p>}
            </div>
            <div className="space-y-2">
              <Label>Estimation d'appareils / portes</Label>
              <Select value={form.deviceRange} onValueChange={(v) => set("deviceRange", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une fourchette…" />
                </SelectTrigger>
                <SelectContent>
                  {DEVICE_RANGES.map((r) => <SelectItem key={r} value={r}>{r} appareils</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Estimation de sites</Label>
              <Select value={form.siteRange} onValueChange={(v) => set("siteRange", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une fourchette…" />
                </SelectTrigger>
                <SelectContent>
                  {SITE_RANGES.map((r) => <SelectItem key={r} value={r}>{r} sites</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Niveau d'accompagnement souhaité</Label>
            <Select value={form.accompaniment} onValueChange={(v) => set("accompaniment", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un niveau…" />
              </SelectTrigger>
              <SelectContent>
                {ACCOMPANIMENT_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Besoins spécifiques</Label>
            <Textarea
              placeholder="Intégrations, personnalisations, exigences réglementaires, environnement technique…"
              value={form.specificNeeds}
              onChange={(e) => set("specificNeeds", e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        {/* Séparateur */}
        <div className="h-px bg-border/60" />

        {/* Section : Contact */}
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Informations de contact</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nom & prénom <span className="text-destructive">*</span></Label>
              <Input placeholder="Jean Dupont" value={form.contactName} onChange={(e) => set("contactName", e.target.value)} className={errors.contactName ? "border-destructive" : ""} />
              {errors.contactName && <p className="text-xs text-destructive">{errors.contactName}</p>}
            </div>
            <div className="space-y-2">
              <Label>Email professionnel <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="contact@entreprise.com" className={cn("pl-9", errors.email ? "border-destructive" : "")} value={form.email} onChange={(e) => set("email", e.target.value)} type="email" />
              </div>
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label>Téléphone</Label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="+221 77 000 00 00" className="pl-9" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Message complémentaire <span className="text-destructive">*</span></Label>
            <Textarea
              placeholder="Décrivez votre contexte, vos objectifs, votre timeline et toute information utile à notre équipe…"
              value={form.message}
              onChange={(e) => set("message", e.target.value)}
              rows={4}
              className={cn("resize-none", errors.message ? "border-destructive" : "")}
            />
            {errors.message && <p className="text-xs text-destructive">{errors.message}</p>}
          </div>
        </div>

        {/* Info bloc */}
        <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/6 p-4">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">Une proposition personnalisée</strong> sera établie sur la base de vos besoins : nombre d'employés, d'appareils, de sites, fonctionnalités requises et niveau d'accompagnement souhaité. Aucun engagement à ce stade.
          </p>
        </div>

        <div className="flex justify-end">
          <Button
            size="lg"
            disabled={loading}
            onClick={handleSubmit}
            className="gap-2 bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20 min-w-50"
          >
            {loading ? (
              <><span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />Envoi en cours…</>
            ) : (
              <><Send className="h-4 w-4" />Envoyer la demande</>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
