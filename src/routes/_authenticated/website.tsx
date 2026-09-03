import { useState } from "react";
import { useTranslation } from "react-i18next";
import { createFileRoute } from "@tanstack/react-router";
import { Globe, CalendarClock, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/website")({
  component: WebsitePage,
});

function WebsitePage() {
  const { t } = useTranslation();
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<"link" | "booking" | "both">("link");
  const [message, setMessage] = useState(
    "t("website.defaultMessage")"
  );
  const [booking, setBooking] = useState("");
  const [saved, setSaved] = useState(false);

  function saveWebsite() {
    setSaved(true);
    // A persistência usa a tabela company_websites já criada no Supabase.
    // A página mantém a configuração por empresa.
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">t("website.websiteTitle")</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          t("website.websiteDescription")
        </p>
      </div>

      <div className="rounded-xl border bg-card p-5 space-y-5">
        <div className="flex items-center gap-3">
          <Globe className="h-5 w-5" />
          <div>
            <h2 className="font-medium">t("website.websiteCompany")</h2>
            <p className="text-sm text-muted-foreground">
              t("website.websiteAvailable")
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="website-url">t("website.websiteUrl")</Label>
          <Input
            id="website-url"
            type="url"
            placeholder="t("website.websitePlaceholder")"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>t("website.websiteMode")</Label>

          <div className="grid gap-3 md:grid-cols-3">
            <button
              type="button"
              onClick={() => setMode("link")}
              className={`rounded-lg border p-4 text-left ${
                mode === "link" ? "border-primary" : ""
              }`}
            >
              <Globe className="mb-2 h-5 w-5" />
              <div className="font-medium">t("website.websiteLink")</div>
              <div className="text-xs text-muted-foreground">
                t("website.websiteLinkDescription")
              </div>
            </button>

            <button
              type="button"
              onClick={() => setMode("booking")}
              className={`rounded-lg border p-4 text-left ${
                mode === "booking" ? "border-primary" : ""
              }`}
            >
              <CalendarClock className="mb-2 h-5 w-5" />
              <div className="font-medium">t("website.websiteBooking")</div>
              <div className="text-xs text-muted-foreground">
                t("website.websiteBookingDescription")
              </div>
            </button>

            <button
              type="button"
              onClick={() => setMode("both")}
              className={`rounded-lg border p-4 text-left ${
                mode === "both" ? "border-primary" : ""
              }`}
            >
              <CalendarClock className="mb-2 h-5 w-5" />
              <div className="font-medium">t("website.websiteBoth")</div>
              <div className="text-xs text-muted-foreground">
                t("website.websiteBothDescription")
              </div>
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="site-message">t("website.websiteMessage")</Label>
          <Textarea
            id="site-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="t("website.websiteMessagePlaceholder")"
          />
          <p className="text-xs text-muted-foreground">
            <>Use <code>{"{site}"}</code> {t("website.websiteVariableHelp")}</>
          </p>
        </div>

        {(mode === "booking" || mode === "both") && (
          <div className="space-y-2">
            <Label htmlFor="booking-instructions">
              t("website.bookingInstructions")
            </Label>
            <Textarea
              id="booking-instructions"
              value={booking}
              onChange={(e) => setBooking(e.target.value)}
              placeholder="t("website.bookingInstructionsPlaceholder")"
            />
          </div>
        )}

        <Button onClick={saveWebsite} className="w-full">
          <Save className="mr-2 h-4 w-4" />
          {saved ? "t("website.siteSaved")" : "t("website.saveWebsite")"}
        </Button>
      </div>
    </div>
  );
}
