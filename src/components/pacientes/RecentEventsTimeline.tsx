"use client"

import type { RecentEvent } from "@/lib/types/patient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatRelativeTime } from "@/lib/utils/patient-helpers"
import { Calendar, Paperclip, Stethoscope, Activity } from "lucide-react"

interface RecentEventsTimelineProps {
  events: RecentEvent[]
}

export function RecentEventsTimeline({ events }: RecentEventsTimelineProps) {
  const getEventIcon = (type: RecentEvent["type"]) => {
    switch (type) {
      case "appointment":
        return Calendar
      case "attachment":
        return Paperclip
      case "diagnosis":
        return Stethoscope
      case "vital_signs":
        return Activity
      default:
        return Activity
    }
  }

  const getEventColor = (type: RecentEvent["type"]) => {
    switch (type) {
      case "appointment":
        return "bg-blue-500"
      case "attachment":
        return "bg-purple-500"
      case "diagnosis":
        return "bg-green-500"
      case "vital_signs":
        return "bg-orange-500"
      default:
        return "bg-gray-500"
    }
  }

  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Eventos Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No hay eventos recientes</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Eventos Recientes</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-4">
            {events.map((event, index) => {
              const Icon = getEventIcon(event.type)
              const colorClass = getEventColor(event.type)

              return (
                <div key={event.id} className="flex gap-3">
                  <div className="relative">
                    <div className={`rounded-full p-2 ${colorClass}`}>
                      <Icon className="h-3 w-3 text-white" />
                    </div>
                    {index < events.length - 1 && (
                      <div className="absolute left-1/2 top-8 h-full w-px -translate-x-1/2 bg-border" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <p className="text-sm font-medium">{event.description}</p>
                    <p className="text-xs text-muted-foreground">{formatRelativeTime(event.date)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
