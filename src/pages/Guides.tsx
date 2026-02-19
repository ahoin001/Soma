import { AppShell } from "@/components/aura";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Input } from "@/components/ui/input";
import { GroceriesContent } from "./Groceries";
import { MealPlansContent } from "./MealPlans";
import { guideArticles } from "@/data/guideArticles";
import { cn } from "@/lib/utils";
import { BookOpen, CalendarDays, ChevronDown, Heart, Search, ShoppingBag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRememberedTab } from "@/hooks/useRememberedTab";
import { useRememberedState } from "@/hooks/useRememberedState";
import { useEffect, useMemo } from "react";
import { guidesQueryDefaults, guidesQuerySchema } from "@/lib/routeSchemas";
import { useRouteQueryState } from "@/hooks/useRouteQueryState";

type TabId = "groceries" | "plans" | "articles";

const Guides = () => {
  const { query, mergeQueryState } = useRouteQueryState(guidesQuerySchema, {
    defaults: guidesQueryDefaults,
  });
  const [tab, setTab] = useRememberedTab<TabId>({
    key: "primary",
    values: ["groceries", "plans", "articles"] as const,
    defaultValue: "groceries",
  });
  const [expandedId, setExpandedId] = useRememberedState<string | null>({
    key: "expanded-article",
    defaultValue: null,
    parse: (raw) => (typeof raw === "string" ? raw : null),
  });
  const [articleQuery, setArticleQuery] = useRememberedState<string>({
    key: "query-article",
    defaultValue: "",
    parse: (raw) => (typeof raw === "string" ? raw : ""),
  });
  const [articleCategory, setArticleCategory] = useRememberedState<string>({
    key: "category-article",
    defaultValue: "All",
    parse: (raw) => (typeof raw === "string" ? raw : "All"),
  });
  const [favoriteArticleIds, setFavoriteArticleIds] = useRememberedState<string[]>({
    key: "favorite-articles",
    defaultValue: [],
    parse: (raw) =>
      Array.isArray(raw) ? raw.filter((entry): entry is string => typeof entry === "string") : [],
  });
  const [favoritesOnly, setFavoritesOnly] = useRememberedState<boolean>({
    key: "favorites-only-articles",
    defaultValue: false,
    parse: (raw) => raw === true,
  });

  // URL -> state (supports deep links and POP navigation)
  useEffect(() => {
    if (query.tab) setTab(query.tab);
    setExpandedId(query.article ?? null);
  }, [query.article, query.tab, setExpandedId, setTab]);

  // state -> URL (shareable/restorable page context)
  useEffect(() => {
    mergeQueryState({
      tab,
      article: tab === "articles" ? expandedId ?? undefined : undefined,
    });
  }, [expandedId, mergeQueryState, tab]);

  const categories = useMemo(() => {
    const unique = Array.from(
      new Set(guideArticles.map((article) => article.category).filter(Boolean) as string[]),
    );
    return ["All", ...unique];
  }, []);

  const favoriteSet = useMemo(() => new Set(favoriteArticleIds), [favoriteArticleIds]);

  const filteredArticles = useMemo(() => {
    const query = articleQuery.trim().toLowerCase();
    const filtered = guideArticles.filter((article) => {
      if (articleCategory !== "All" && article.category !== articleCategory) return false;
      if (favoritesOnly && !favoriteSet.has(article.id)) return false;
      if (!query) return true;
      return (
        article.title.toLowerCase().includes(query) ||
        article.description.toLowerCase().includes(query) ||
        (article.category ?? "").toLowerCase().includes(query)
      );
    });
    return [...filtered].sort((a, b) => {
      const favDiff = Number(favoriteSet.has(b.id)) - Number(favoriteSet.has(a.id));
      if (favDiff !== 0) return favDiff;
      return a.title.localeCompare(b.title);
    });
  }, [articleCategory, articleQuery, favoriteSet, favoritesOnly]);

  const activeArticle = useMemo(
    () => guideArticles.find((article) => article.id === expandedId) ?? null,
    [expandedId],
  );

  const toggleFavorite = (articleId: string) => {
    setFavoriteArticleIds((prev) =>
      prev.includes(articleId) ? prev.filter((id) => id !== articleId) : [...prev, articleId],
    );
  };

  return (
    <AppShell experience="nutrition">
      <div
        className="mx-auto w-full max-w-[420px] px-4 pb-10"
        style={{ paddingTop: "calc(1.5rem + var(--sat, env(safe-area-inset-top)))" }}
      >
        <div className="rounded-[28px] bg-gradient-to-br from-primary/30 via-primary/15 to-card px-5 py-6 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">
            Guides
          </p>
          <h1 className="text-2xl font-display font-semibold text-foreground">
            {tab === "groceries"
              ? "Groceries, plans & articles"
              : tab === "plans"
                ? "Meal plans, groceries & articles"
                : "Articles, plans & groceries"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tab === "groceries"
              ? "Build your bag, create plan days, or read guides."
              : tab === "plans"
                ? "Day templates to hit your targets—reference when planning meals."
                : "Quality health info, then build your days."}
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
              { value: "plans", label: (
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Meal plans
                </span>
              )},
              { value: "articles", label: (
                <span className="flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5" />
                  Articles
                </span>
              )},
            ]}
            className="w-full rounded-full bg-card p-1 shadow-[0_10px_24px_rgba(15,23,42,0.06)]"
            itemClassName="flex-1 rounded-full py-2.5"
            activeClassName="bg-primary text-primary-foreground shadow-sm"
            inactiveClassName="text-muted-foreground hover:text-foreground"
          />
        </div>

        {tab === "groceries" && <GroceriesContent showHeader={false} />}
        {tab === "plans" && <MealPlansContent showHeader={false} />}

        {tab === "articles" && (
          <div className="mt-6 space-y-4">
            <div className="rounded-[22px] border border-border/60 bg-card/90 p-3 shadow-[0_12px_26px_rgba(15,23,42,0.08)]">
              <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background px-3 py-2">
                <Search className="h-4 w-4 text-primary" />
                <Input
                  value={articleQuery}
                  onChange={(e) => setArticleQuery(e.target.value)}
                  placeholder="Search articles..."
                  className="h-6 border-none bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setFavoritesOnly((v) => !v)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold transition",
                    favoritesOnly
                      ? "bg-primary text-primary-foreground shadow-[0_8px_18px_rgba(15,23,42,0.22)]"
                      : "bg-secondary text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Heart className={cn("h-3.5 w-3.5", favoritesOnly && "fill-current")} />
                  Favorites
                </button>
                {categories.map((category) => {
                  const active = articleCategory === category;
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setArticleCategory(category)}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-[11px] font-semibold transition",
                        active
                          ? "bg-primary text-primary-foreground shadow-[0_8px_18px_rgba(15,23,42,0.22)]"
                          : "bg-secondary text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {filteredArticles.length} article{filteredArticles.length === 1 ? "" : "s"} found
              </p>
            </div>
            {filteredArticles.length === 0 ? (
              <div className="rounded-[20px] border border-dashed border-border/60 bg-card/70 px-4 py-8 text-center">
                <p className="text-sm font-semibold text-foreground">No matching articles</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Try a different keyword or category.
                </p>
              </div>
            ) : null}
            {filteredArticles.map((article) => {
              const isExpanded = expandedId === article.id;
              return (
                <div
                  key={article.id}
                  className={cn(
                    "overflow-hidden rounded-[24px] border border-border/60 bg-card shadow-[0_16px_36px_rgba(15,23,42,0.08)] transition-shadow",
                    isExpanded && "ring-2 ring-primary/30",
                  )}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setExpandedId(isExpanded ? null : article.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setExpandedId(isExpanded ? null : article.id);
                      }
                    }}
                    className="w-full px-5 py-4 text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        {article.category && (
                          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                            {article.category}
                          </span>
                        )}
                        <h2 className="mt-1 text-base font-semibold text-foreground">
                          {article.title}
                        </h2>
                        <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">
                          {article.description}
                        </p>
                        <p className="mt-2 text-xs font-semibold text-primary/80">
                          Tap to read
                        </p>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            toggleFavorite(article.id);
                          }}
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-full bg-secondary transition",
                            favoriteSet.has(article.id)
                              ? "text-primary"
                              : "text-secondary-foreground hover:text-foreground",
                          )}
                          aria-label={
                            favoriteSet.has(article.id)
                              ? "Remove from favorites"
                              : "Add to favorites"
                          }
                        >
                          <Heart
                            className={cn("h-4 w-4", favoriteSet.has(article.id) && "fill-current")}
                          />
                        </button>
                        <span
                          className={cn(
                            "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition",
                            isExpanded && "rotate-180 bg-primary/20 text-primary",
                          )}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {tab === "articles" && activeArticle && (
        <div className="fixed inset-0 z-[70]">
          <button
            type="button"
            className="absolute inset-0 bg-background/75 backdrop-blur-sm"
            aria-label="Close article reader"
            onClick={() => setExpandedId(null)}
          />
          <div
            className="absolute inset-x-0 bottom-0 top-[max(4rem,var(--sat,env(safe-area-inset-top)))] mx-auto w-full max-w-[420px] rounded-t-[28px] border border-border/60 bg-card shadow-[0_-14px_40px_rgba(15,23,42,0.2)]"
            role="dialog"
            aria-modal="true"
            aria-label={activeArticle.title}
          >
            <div className="flex h-full flex-col overflow-hidden">
              <div className="border-b border-border/60 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {activeArticle.category ? (
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/80">
                        {activeArticle.category}
                      </p>
                    ) : null}
                    <h2 className="mt-1 text-base font-semibold text-foreground">
                      {activeArticle.title}
                    </h2>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="h-9 w-9 shrink-0 rounded-full"
                    onClick={() => toggleFavorite(activeArticle.id)}
                    aria-label={
                      favoriteSet.has(activeArticle.id)
                        ? "Remove from favorites"
                        : "Add to favorites"
                    }
                  >
                    <Heart
                      className={cn(
                        "h-4 w-4",
                        favoriteSet.has(activeArticle.id) ? "fill-current text-primary" : "",
                      )}
                    />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="h-9 w-9 shrink-0 rounded-full"
                    onClick={() => setExpandedId(null)}
                    aria-label="Close article"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="aura-sheet-scroll flex-1 overflow-y-auto px-4 py-4 pb-10">
                <div className="text-foreground">{activeArticle.body}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
};

export default Guides;
