import { citaToEvent } from "@/lib/adapter/citaToFullCalendar";
import { apiListCitas } from "@/lib/api/agenda/citas";
import type { EventSourceFunc } from "@fullcalendar/core";

type Filters = {
  profesionalId?: number | string;
  consultorioId?: number | string;
};

export function useCitasCalendarSource(filters?: Filters) {
  const events: EventSourceFunc = async (info, success, failure) => {
    try {
      const { data } = await apiListCitas({
        start: info.startStr,
        end: info.endStr,
        profesionalId: filters?.profesionalId,
        consultorioId: filters?.consultorioId,
        page: 1,
        limit: 80,
      });
      console.log(data)
      success(data.map(citaToEvent));
    } catch (err) {
      console.error("[CitasSource] error", err);
      failure(err as any);
    }
  };


  return { events };
}
