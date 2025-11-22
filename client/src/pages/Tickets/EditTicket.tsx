import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { useTranslation } from "react-i18next";
import TicketForm from "./TicketForm";
import { Loader2 } from "lucide-react";

export default function EditTicket() {
  const { t } = useTranslation('system');
  const [, params] = useRoute("/tickets/edit/:id");
  const ticketId = params?.id;

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['/api/tickets', ticketId],
    queryFn: async () => {
      const response = await fetch(`/api/tickets/${ticketId}`);
      if (!response.ok) throw new Error(t('failedToLoadTickets'));
      return response.json();
    },
    enabled: !!ticketId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-slate-600">{t('ticketNotFound')}</p>
      </div>
    );
  }

  return <TicketForm mode="edit" ticket={ticket} />;
}
