import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { createFileRoute } from "@tanstack/react-router";
import { Globe, CalendarClock, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  getMyWebsite,
  saveMyWebsite,
} from "@/lib/website.functions";

export const Route = createFileRoute("/_authenticated/website")({
  component: WebsitePage,
});

function WebsitePage() {
  const { t } = useTranslation();

  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<"link" | "booking" | "both">("link");
  const [message, setMessage] = useState("");
  const [booking, setBooking] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    getMyWebsite()
      .then(({ website }) => {
        if (!mounted) return;

        if (website) {
          setUrl(website.url ?? "");
          setMode(website.usage_mode ?? "link");
          setMessage(website.link_message ?? "");
          setBooking(website.booking_instructions ?? "");
        } else {
          setMessage(t("website.defaultMessage"));
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err instanceof Error ? err.message : t("website.loadError"));
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [t]);

  async function handleSave() {
    setError("");
    setSaved(false);
    setSaving(true);

    try {
      await saveMyWebsite({
        url,
        isActive: true,
        usageMode: mode,
        linkMessage: message,
        bookingInstructions: booking,
      });

      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("website.saveError"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        {t("website.loading")}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {t("website.websiteTitle")}
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          {t("website.websiteDescription")}
        </p>
      </div>

      <div className="space-y-5 rounded-xl border bg-card p-5">
        <div className="flex items-center gap-3">
          <Globe className="h-5 w-5" />

          <div>
            <h2 className="font-medium">
              {t("website.websiteCompany")}
            </h2>

            <p className="text-sm text-muted-foreground">
              {t("website.websiteAvailable")}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="website-url">
            {t("website.websiteUrl")}
          </Label>

          <Input
            id="website-url"
            type="url"
            placeholder={t("website.websitePlaceholder")}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>{t("website.websiteMode")}</Label>

          <div className="grid gap-3 md:grid-cols-3">
            <button
              type="button"
              onClick={() => setMode("link")}
              className={`rounded-lg border p-4 text-left ${
                mode === "link" ? "border-primary" : ""
              }`}
            >
              <Globe className="mb-2 h-5 w-5" />

              <div className="font-medium">
                {t("website.websiteLink")}
              </div>

              <div className="text-xs text-muted-foreground">
                {t("website.websiteLinkDescription")}
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

              <div className="font-medium">
                {t("website.websiteBooking")}
              </div>

              <div className="text-xs text-muted-foreground">
                {t("website.websiteBookingDescription")}
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

              <div className="font-medium">
                {t("website.websiteBoth")}
              </div>

              <div className="text-xs text-muted-foreground">
                {t("website.websiteBothDescription")}
              </div>
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="site-message">
            {t("website.websiteMessage")}
          </Label>

          <Textarea
            id="site-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t("website.websiteMessagePlaceholder")}
          />

          <p className="text-xs text-muted-foreground">
            {t("website.websiteVariableHelp")}{" "}
            <code>{"{site}"}</code>
          </p>
        </div>

        {(mode === "booking" || mode === "both") && (
          <div className="space-y-2">
            <Label htmlFor="booking-instructions">
              {t("website.bookingInstructions")}
            </Label>

            <Textarea
              id="booking-instructions"
              value={booking}
              onChange={(e) => setBooking(e.target.value)}
              placeholder={t("website.bookingInstructionsPlaceholder")}
            />
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive">
            {error}
          </p>
        )}

        <Button
          onClick={handleSave}
          disabled={saving || !url.trim()}
          className="w-full"
        >
          <Save className="mr-2 h-4 w-4" />

          {saving
            ? t("website.saving")
            : saved
              ? t("website.siteSaved")
              : t("website.saveWebsite")}
        </Button>
      </div>
    </div>
  );
}
