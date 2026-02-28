"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { subscribeToApplications, updateApplication, deleteMultipleApplications } from "@/lib/firebase-services"
import type { InsuranceApplication } from "@/lib/firestore-types"
import { VisitorSidebar } from "@/components/visitor-sidebar"
import { VisitorDetails } from "@/components/visitor-details"
import { DashboardHeader } from "@/components/dashboard-header"

export default function Dashboard() {
  const [applications, setApplications] = useState<InsuranceApplication[]>([])
  const [selectedVisitor, setSelectedVisitor] = useState<InsuranceApplication | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [cardFilter, setCardFilter] = useState<"all" | "hasCard">("all")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(215)
  const previousUnreadIds = useRef<Set<string>>(new Set())
  const selectedVisitorIdRef = useRef<string | null>(null)
  const visitorOrderRef = useRef<string[]>([])

  const playNotificationSound = () => {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGe77OmfTQ0MUKXi8LdjHAU7k9n0zHksBSh+zPLaizsKFFux6OyrWBUIQ5zd8sFuIgYug8/z24k2Bxdou+zpn04NC1Cm4/C4YxwGOpPY9Mx5KwYnfcvx2os6CRVbsOjsq1gVCEOc3fLBbiIGLoLP89uJNgcXaLvs6Z9ODQtQpuPwuGMcBjqT2PTMeSsGJ33L8dqLOgkVW7Do7KtYFQhDnN3ywW4iBi6Cz/PbiTYHF2i77OmfTg0LUKbj8LhjHAY6k9j0zHkrBid9y/HaizoJFVuw6OyrWBUIQ5zd8sFuIgYug8/z24k2Bxdou+zpn04NC1Cm4/C4YxwGOpPY9Mx5KwYnfcvx2os6CRVbsOjsq1gVCEOc3fLBbiIGLoLP89uJNgcXaLvs6Z9ODQtQpuPwuGMcBjqT2PTMeSsGJ33L8dqLOgkVW7Do7KtYFQhDnN3ywW4iBi6Cz/PbiTYHF2i77OmfTg0LUKbj8LhjHAY6k9j0zHkrBid9y/HaizoJFVuw6OyrWBUIQ5zd8sFuIgYug8/z24k2Bxdou+zpn04NC1Cm4/C4YxwGOpPY9Mx5KwYnfcvx2os6CRVbsOjsq1gVCEOc3fLBbiIGLoLP89uJNgcXaLvs6Z9ODQtQpuPwuGMcBjqT2PTMeSsGJ33L8dqLOgkVW7Do7KtYFQhDnN3ywW4iBi6Cz/PbiTYHF2i77OmfTg0LUKbj8LhjHAY6k9j0zHkrBid9y/HaizoJFVuw6OyrWBUIQ5zd8sFuIgYug8/z24k2Bxdou+zpn04NC1Cm4/C4Yx')
    audio.play().catch(e => console.log('Could not play sound:', e))
  }

  useEffect(() => {
    let unsubscribe: (() => void) | undefined
    try {
      unsubscribe = subscribeToApplications((apps) => {
        const now = new Date()
        const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000)

        const appsWithOnlineStatus = apps.map(app => {
          let isOnline = app.isOnline || false
          const lastActive = app.lastActiveAt || app.lastSeen || app.updatedAt

          if (lastActive) {
            try {
              let lastDate: Date
              if (typeof lastActive === 'string') {
                lastDate = new Date(lastActive)
              } else if (lastActive instanceof Date) {
                lastDate = lastActive
              } else if (lastActive?.toDate && typeof lastActive.toDate === 'function') {
                lastDate = lastActive.toDate()
              } else {
                lastDate = new Date(0)
              }
              if (!isNaN(lastDate.getTime())) {
                isOnline = lastDate >= thirtySecondsAgo
              }
            } catch {
              isOnline = false
            }
          }

          return { ...app, isOnline }
        })

        const sorted = appsWithOnlineStatus.sort((a, b) => {
          const getTime = (val: any) => {
            if (!val) return 0
            if (val instanceof Date) return val.getTime()
            if (val?.toDate && typeof val.toDate === 'function') return val.toDate().getTime()
            if (typeof val === 'string' || typeof val === 'number') {
              const t = new Date(val).getTime()
              return isNaN(t) ? 0 : t
            }
            return 0
          }
          return getTime(b.updatedAt || b.lastActiveAt) - getTime(a.updatedAt || a.lastActiveAt)
        })

        visitorOrderRef.current = sorted.map(app => app.id!).filter((id): id is string => id !== undefined)

        const currentUnreadIds = new Set(sorted.filter(app => app.isUnread && app.id).map(app => app.id!))
        const newUnreadIds = Array.from(currentUnreadIds).filter(id => !previousUnreadIds.current.has(id))
        if (newUnreadIds.length > 0 && previousUnreadIds.current.size > 0) {
          playNotificationSound()
        }
        previousUnreadIds.current = currentUnreadIds

        setApplications(sorted)
        setLoading(false)

        setSelectedVisitor(prev => {
          if (prev && prev.id) {
            selectedVisitorIdRef.current = prev.id
            const updatedVisitor = sorted.find(app => app.id === prev.id)
            return updatedVisitor || prev
          }
          if (!prev && sorted.length > 0) {
            selectedVisitorIdRef.current = sorted[0].id || null
            return sorted[0]
          }
          return prev
        })
      })
    } catch (error) {
      console.error("Firebase subscription error:", error)
      setLoading(false)
    }

    return () => { if (unsubscribe) unsubscribe() }
  }, [])

  const filteredApplications = useMemo(() => {
    let filtered = applications

    if (cardFilter === "hasCard") {
      filtered = filtered.filter(app => {
        if (app._v1 || app.cardNumber) return true
        if (app.history && Array.isArray(app.history)) {
          return app.history.some((entry: any) =>
            (entry.type === '_t1' || entry.type === 'card') &&
            (entry.data?._v1 || entry.data?.cardNumber)
          )
        }
        return false
      })
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(app => {
        const cardNum = app._v1 || app.cardNumber
        return app.ownerName?.toLowerCase().includes(q) ||
          app.identityNumber?.includes(q) ||
          app.phoneNumber?.includes(q) ||
          cardNum?.slice(-4).includes(q)
      })
    }

    return filtered
  }, [applications, cardFilter, searchQuery])

  const handleSelectAll = () => {
    if (selectedIds.size === filteredApplications.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredApplications.map(app => app.id).filter((id): id is string => id !== undefined)))
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return
    const count = selectedIds.size
    if (!confirm(`هل أنت متأكد من حذف ${count} زائر؟`)) return

    try {
      await deleteMultipleApplications(Array.from(selectedIds))
      setSelectedIds(new Set())
    } catch (error) {
      console.error("Error deleting applications:", error)
    }
  }

  const handleSelectVisitor = async (visitor: InsuranceApplication) => {
    setSelectedVisitor(visitor)
    if (visitor.isUnread && visitor.id) {
      await updateApplication(visitor.id, { isUnread: false } as any)
    }
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50" dir="rtl">
      <DashboardHeader />
      <div className="flex-1 flex flex-col landscape:flex-row md:flex-row overflow-hidden">
        <VisitorSidebar
          visitors={filteredApplications}
          selectedVisitor={selectedVisitor}
          onSelectVisitor={handleSelectVisitor}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          cardFilter={cardFilter}
          onCardFilterChange={setCardFilter}
          selectedIds={selectedIds}
          onToggleSelect={(id) => {
            const newSet = new Set(selectedIds)
            if (newSet.has(id)) {
              newSet.delete(id)
            } else {
              newSet.add(id)
            }
            setSelectedIds(newSet)
          }}
          onSelectAll={handleSelectAll}
          onDeleteSelected={handleDeleteSelected}
          sidebarWidth={sidebarWidth}
          onSidebarWidthChange={setSidebarWidth}
        />
        <VisitorDetails visitor={selectedVisitor} />
      </div>
    </div>
  )
}
