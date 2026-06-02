import { ActivityLogView } from "@/pages/Activity";

export default function BtActivityFeed() {
  return <ActivityLogView restrictRole="binding_team" />;
}
