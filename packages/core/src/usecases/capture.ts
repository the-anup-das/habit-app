import { type Clock, getLocalDate } from "../datetime/clock";

export interface CaptureDeps {
  entriesRepo: {
    createEntry(params: any): Promise<string>;
    updateEntry(params: any): Promise<void>;
    deleteEntry(id: string): Promise<void>;
  };
  clock: Clock;
}

export interface QuickEntryParams {
  moodId: string;
  activityIds: string[];
  note?: string;
  /** Pass explicit timestamp to backdate, otherwise uses current time */
  happenedAt?: number;
  scales?: any[];
  media?: any[];
}

export interface UpdateQuickEntryParams extends QuickEntryParams {
  id: string;
}

export class CaptureUseCase {
  constructor(private readonly deps: CaptureDeps) {}

  async logQuickEntry(params: QuickEntryParams): Promise<string> {
    const clock = this.deps.clock;
    const happenedAt = params.happenedAt ?? clock.now();
    const localDate = getLocalDate(clock, happenedAt);

    return this.deps.entriesRepo.createEntry({
      moodId: params.moodId,
      activityIds: params.activityIds,
      happenedAt,
      localDate,
      tzOffsetMinutes: clock.getTimezoneOffset(),
      note: params.note,
      scales: params.scales,
      media: params.media,
    });
  }

  async updateQuickEntry(params: UpdateQuickEntryParams): Promise<void> {
    const clock = this.deps.clock;
    const happenedAt = params.happenedAt ?? clock.now();
    const localDate = getLocalDate(clock, happenedAt);

    return this.deps.entriesRepo.updateEntry({
      id: params.id,
      moodId: params.moodId,
      activityIds: params.activityIds,
      happenedAt,
      localDate,
      tzOffsetMinutes: clock.getTimezoneOffset(),
      note: params.note,
      scales: params.scales,
      media: params.media,
    });
  }

  async deleteEntry(id: string): Promise<void> {
    return this.deps.entriesRepo.deleteEntry(id);
  }
}
