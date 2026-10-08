import { useParams } from "wouter";
import CaseReview from "@/components/chinese-literacy/CaseReview";

export default function ChineseLiteracyPage() {
  const params = useParams();
  return <CaseReview caseId={params.id as string} />;
}
