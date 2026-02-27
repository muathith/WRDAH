import Image from "next/image"
import { type ReactNode } from "react"
import { cn } from "@/lib/utils"

interface StepShellProps {
  step: number
  totalSteps?: number
  title: string
  subtitle?: string
  icon?: ReactNode
  children: ReactNode
  maxWidthClassName?: string
  cardClassName?: string
  headerAction?: ReactNode
}

export function StepShell({
  step,
  totalSteps = 8,
  title,
  subtitle,
  icon,
  children,
  maxWidthClassName = "max-w-md",
  cardClassName,
  headerAction,
}: StepShellProps) {
  const progress = Math.max(0, Math.min(100, Math.round((step / totalSteps) * 100)))

  return (
    <div className="min-h-screen bg-[#eef3f8] px-3 py-4 sm:px-4 sm:py-6" dir="rtl">
      <div className={cn("mx-auto w-full space-y-4", maxWidthClassName)}>
        <header className="rounded-2xl border border-[#d8e2ec] bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            {headerAction ?? (
              <span className="inline-flex h-9 min-w-12 items-center justify-center rounded-lg border border-[#d8e2ec] bg-[#f6f9fc] px-3 text-xs font-bold text-[#145072]">
                EN
              </span>
            )}

            <div className="flex items-center gap-2">
              <Image src="/icon.svg" alt="bCare" width={28} height={28} />
              <span className="text-lg font-extrabold text-[#145072]">bCare</span>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#145072] text-sm font-bold text-white shadow-sm">
              B
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-[#f2ddbc] bg-[#fff8eb] px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[#3a6077]">تتبع الطلب</p>
            <span className="text-base font-extrabold text-[#f59e0b]">{progress}%</span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#d9e4ee]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#1b80c2] to-[#145072] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-[#6b8396]">
            الخطوة {step} من {totalSteps}
          </p>
        </section>

        <section
          className={cn(
            "rounded-[1.75rem] border border-[#dbe6ef] bg-white px-5 py-6 shadow-[0_20px_45px_-28px_rgba(20,66,98,0.45)] sm:px-6 sm:py-7",
            cardClassName,
          )}
        >
          {icon ? (
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#e8f1f9] text-[#145072]">
                {icon}
              </div>
            </div>
          ) : null}

          <h1 className="text-center text-2xl font-extrabold text-[#174f70]">{title}</h1>
          {subtitle ? <p className="mt-2 text-center text-sm leading-relaxed text-[#5f788b]">{subtitle}</p> : null}

          <div className="mt-5 space-y-4">{children}</div>
        </section>
      </div>
    </div>
  )
}
