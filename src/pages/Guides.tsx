import { useState } from "react";
import { AppShell } from "@/components/aura";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { GroceriesContent } from "./Groceries";
import { guideArticles } from "@/data/guideArticles";
import { cn } from "@/lib/utils";
import { BookOpen, ChevronDown, ShoppingBag, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type TabId = "groceries" | "articles";

const Guides = () => {
  const [tab, setTab] = useState<TabId>("groceries");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <AppShell experience="nutrition">
      <div
        className="mx-auto w-full max-w-[420px] px-4 pb-10"
        style={{ paddingTop: "calc(1.5rem + var(--sat, env(safe-area-inset-top)))" }}
      >
        <div className="rounded-[28px] bg-gradient-to-br from-emerald-200 via-emerald-100 to-white px-5 py-6 shadow-[0_18px_40px_rgba(16,185,129,0.18)]">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-500">
            Guides
          </p>
          <h1 className="text-2xl font-display font-semibold text-emerald-950">
            {tab === "groceries" ? "Groceries & articles" : "Articles & groceries"}
          </h1>
          <p className="mt-1 text-sm text-emerald-700/70">
            {tab === "groceries"
              ? "Build your bag or read health guides."
              : "Quality health info, then build your bag."}
          </p>
        </div>

        <div className="mt-6">
          <SegmentedControl
            value={tab}
            onValueChange={(v) => setTab(v as TabId)}
            options={[
              { value: "groceries", label: (
                <span className="flex items-center gap-1.5">
                  <ShoppingBag className="h-3.5 w-3.5" />
                  Groceries
                </span>
              )},
              { value: "articles", label: (
                <span className="flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5" />
                  Articles
                </span>
              )},
            ]}
            className="w-full rounded-full bg-white p-1 shadow-[0_10px_24px_rgba(15,23,42,0.06)]"
            itemClassName="flex-1 rounded-full py-2.5"
            activeClassName="bg-aura-primary text-white shadow-sm"
            inactiveClassName="text-slate-600 hover:text-slate-900"
          />
        </div>

        {tab === "groceries" && <GroceriesContent showHeader={false} />}

        {tab === "articles" && expandedId && (
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={() => setExpandedId(null)}
            className="fixed left-1/2 z-50 h-12 w-12 -translate-x-1/2 rounded-full shadow-lg"
            style={{ bottom: "calc(5rem + var(--sab, env(safe-area-inset-bottom)))" }}
            aria-label="Close article"
          >
            <X className="h-5 w-5" />
          </Button>
        )}

        {tab === "articles" && (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-slate-500">
              Tap a card to expand and read the full article.
            </p>
            {guideArticles.map((article) => {
              const isExpanded = expandedId === article.id;
              return (
                <div
                  key={article.id}
                  className={cn(
                    "overflow-hidden rounded-[24px] border border-black/5 bg-white shadow-[0_16px_36px_rgba(15,23,42,0.08)] transition-shadow",
                    isExpanded && "ring-2 ring-emerald-200",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : article.id)}
                    className="w-full px-5 py-4 text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        {article.category && (
                          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-500">
                            {article.category}
                          </span>
                        )}
                        <h2 className="mt-1 text-base font-semibold text-slate-900">
                          {article.title}
                        </h2>
                        <p className="mt-1.5 text-sm text-slate-600 line-clamp-2">
                          {article.description}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 transition",
                          isExpanded && "rotate-180 bg-emerald-100",
                        )}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </span>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="border-t border-slate-100 px-5 py-4">
                      <div className="text-slate-700">
                        {article.body}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default Guides;
