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
import { useI18n } from "@/lib/i18n/context"
import { billingDict } from "@/lib/i18n/pages/billing"
import { cn } from "@/lib/utils"

const FEATURE_ICONS = [Users, Cpu, Globe, Zap, Headphones, Sparkles]

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

export function BillingCustomOffer() {
  const { locale, t } = useI18n()
  const tr = billingDict[locale]
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
    if (!form.companyName.trim()) e.companyName = t.common.required
    if (!form.employeeRange) e.employeeRange = t.common.required
    if (!form.contactName.trim()) e.contactName = t.common.required
    if (!form.email.trim()) e.email = t.common.required
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = tr.custom.invalidEmail
    if (!form.message.trim()) e.message = t.common.required
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
          <h3 className="text-xl font-bold text-success">{tr.custom.successTitle}</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {tr.custom.successBefore}<strong>{tr.custom.successStrong}</strong>{tr.custom.successAfter}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 justify-center">
          <Button variant="outline" onClick={() => { setSuccess(false); setForm(EMPTY_FORM) }} className="gap-2">
            <Send className="h-3.5 w-3.5" />
            {tr.custom.newRequest}
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
              {tr.custom.heroKicker}
            </span>
          </div>
          <h1 className="text-2xl font-extrabold md:text-3xl">
            {tr.custom.heroTitle}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {tr.custom.heroDesc}
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {tr.custom.heroTags.map((tag) => (
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
        {tr.custom.features.map((f, i) => {
          const FIcon = FEATURE_ICONS[i] ?? Sparkles
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
        <h3 className="mb-4 font-semibold text-sm">{tr.custom.howTitle}</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {tr.custom.steps.map((step, i) => (
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
          <h3 className="font-bold text-base">{tr.custom.formTitle}</h3>
        </div>

        {/* Section : Entreprise */}
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tr.custom.companySection}</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{tr.custom.companyName} <span className="text-destructive">*</span></Label>
              <Input placeholder={tr.custom.companyPlaceholder} value={form.companyName} onChange={(e) => set("companyName", e.target.value)} className={errors.companyName ? "border-destructive" : ""} />
              {errors.companyName && <p className="text-xs text-destructive">{errors.companyName}</p>}
            </div>
            <div className="space-y-2">
              <Label>{tr.custom.employeesEstimate} <span className="text-destructive">*</span></Label>
              <Select value={form.employeeRange} onValueChange={(v) => set("employeeRange", v)}>
                <SelectTrigger className={errors.employeeRange ? "border-destructive" : ""}>
                  <SelectValue placeholder={tr.custom.rangePlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {tr.custom.employeeRanges.map((r) => <SelectItem key={r} value={r}>{tr.custom.employeesOption(r)}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.employeeRange && <p className="text-xs text-destructive">{errors.employeeRange}</p>}
            </div>
            <div className="space-y-2">
              <Label>{tr.custom.devicesEstimate}</Label>
              <Select value={form.deviceRange} onValueChange={(v) => set("deviceRange", v)}>
                <SelectTrigger>
                  <SelectValue placeholder={tr.custom.rangePlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {tr.custom.deviceRanges.map((r) => <SelectItem key={r} value={r}>{tr.custom.devicesOption(r)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{tr.custom.sitesEstimate}</Label>
              <Select value={form.siteRange} onValueChange={(v) => set("siteRange", v)}>
                <SelectTrigger>
                  <SelectValue placeholder={tr.custom.rangePlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {tr.custom.siteRanges.map((r) => <SelectItem key={r} value={r}>{tr.custom.sitesOption(r)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{tr.custom.accompanimentLabel}</Label>
            <Select value={form.accompaniment} onValueChange={(v) => set("accompaniment", v)}>
              <SelectTrigger>
                <SelectValue placeholder={tr.custom.levelPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {tr.custom.accompanimentLevels.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{tr.custom.specificNeeds}</Label>
            <Textarea
              placeholder={tr.custom.specificNeedsPlaceholder}
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
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tr.custom.contactSection}</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{tr.custom.contactName} <span className="text-destructive">*</span></Label>
              <Input placeholder={tr.custom.contactPlaceholder} value={form.contactName} onChange={(e) => set("contactName", e.target.value)} className={errors.contactName ? "border-destructive" : ""} />
              {errors.contactName && <p className="text-xs text-destructive">{errors.contactName}</p>}
            </div>
            <div className="space-y-2">
              <Label>{tr.custom.emailLabel} <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder={tr.custom.emailPlaceholder} className={cn("pl-9", errors.email ? "border-destructive" : "")} value={form.email} onChange={(e) => set("email", e.target.value)} type="email" />
              </div>
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label>{tr.custom.phoneLabel}</Label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="+221 77 000 00 00" className="pl-9" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{tr.custom.messageLabel} <span className="text-destructive">*</span></Label>
            <Textarea
              placeholder={tr.custom.messagePlaceholder}
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
            <strong className="text-foreground">{tr.custom.infoStrong}</strong>{tr.custom.infoRest}
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
              <><span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />{tr.custom.sending}</>
            ) : (
              <><Send className="h-4 w-4" />{tr.custom.send}</>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
