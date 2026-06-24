import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { EventsType } from "../../../constants/events.option";
import { BullmqService } from "../bullmq.service";

@Injectable()
export class CloudwatchLogListener {
  constructor(private readonly bullmqService: BullmqService) {}

  @OnEvent(EventsType.REMOTE_LOG)
  async handleRemoteLogEvent(payload: any) {
    await this.bullmqService.addCloudwatchLogJob(payload);
  }
}