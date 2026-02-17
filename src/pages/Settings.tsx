import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SegmentedControl, type SegmentedOption } from "@/components/ui/segmented-control";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useUserSettings, useExperienceTransitionConfig } from "@/state";
import { useTheme } from "next-themes";
import { ChevronDown, ChevronLeft } from "lucide-react";
import { AppShell } from "@/components/aura";

const headerStyleOptions: SegmentedOption[] = [
  { value: "immersive", label: "Immersive" },
  { value: "card", label: "Card" },
  { value: "media", label: "Media" },
];

const homeOptions: SegmentedOption[] = [
  { value: "nutrition", label: "Nutrition" },
  { value: "fitness", label: "Fitness" },
];

const themeModeOptions: SegmentedOption[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

const themePaletteOptions: SegmentedOption[] = [
  { value: "emerald", label: "Emerald" },
  { value: "ocean", label: "Ocean" },
];

export default function Settings() {
  const navigate = useNavigate();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const {
    showFoodImages,
    setShowFoodImages,
    foodImageBackground,
    setFoodImageBackground,
    headerStyle,
    setHeaderStyle,
    defaultHome,
    setDefaultHome,
    themePalette,
    setThemePalette,
  } = useUserSettings();
  const { experienceTransitionConfig, setExperienceTransitionConfig } =
    useExperienceTransitionConfig();

  return (
    <AppShell experience="nutrition">
      <div className="mx-auto w-full max-w-[420px] px-4 pb-10">
        <div className="flex items-center gap-2 py-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-display font-semibold text-foreground">
            Settings
          </h1>
        </div>

        <Card className="card-default mt-4 rounded-[24px] px-4 py-4">
          <p className="section-title">Preferences</p>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                Show food images
              </p>
              <p className="text-xs text-muted-foreground">
                Toggle food photos across lists and sheets.
              </p>
            </div>
            <Switch
              checked={showFoodImages}
              onCheckedChange={setShowFoodImages}
            />
          </div>
          {showFoodImages && (
            <div className="mt-4 border-t border-border/60 pt-4">
              <p className="section-caption">Food image background</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Normalize food photos: white background or transparent (blends with theme; good for dark mode).
              </p>
              <SegmentedControl
                value={foodImageBackground}
                options={[
                  { value: "white", label: "White" },
                  { value: "transparent", label: "Transparent" },
                ]}
                onValueChange={(next) =>
                  setFoodImageBackground(next === "transparent" ? "transparent" : "white")
                }
                className="mt-3"
                itemClassName="bg-muted"
                activeClassName="text-primary-foreground"
                inactiveClassName="text-muted-foreground"
                indicatorClassName="bg-primary"
              />
            </div>
          )}
          <div className="mt-4 border-t border-border/60 pt-4">
            <p className="section-caption">Header look & feel</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Try the three immersive PWA styles from the brief.
            </p>
            <SegmentedControl
              value={headerStyle}
              options={headerStyleOptions}
              onValueChange={(next) => setHeaderStyle(next as "immersive" | "card" | "media")}
              className="mt-3"
              itemClassName="bg-muted"
              activeClassName="text-primary-foreground"
              inactiveClassName="text-muted-foreground"
              indicatorClassName="bg-primary"
            />
          </div>
          <div className="mt-4 border-t border-border/60 pt-4">
            <p className="section-caption">Default home</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Open the app on
            </p>
            <p className="text-xs text-muted-foreground">
              Choose which experience loads first.
            </p>
            <SegmentedControl
              value={defaultHome}
              options={homeOptions}
              onValueChange={(next) =>
                setDefaultHome(next === "fitness" ? "fitness" : "nutrition")
              }
              className="mt-3"
              itemClassName="bg-muted"
              activeClassName="text-primary-foreground"
              inactiveClassName="text-muted-foreground"
              indicatorClassName="bg-primary"
            />
          </div>
          <div className="mt-4 border-t border-border/60 pt-4">
            <p className="section-caption">Theme mode</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Light, dark, or system
            </p>
            <p className="text-xs text-muted-foreground">
              Current resolved mode: {resolvedTheme === "dark" ? "Dark" : "Light"}.
            </p>
            <SegmentedControl
              value={theme ?? "system"}
              options={themeModeOptions}
              onValueChange={(next) => setTheme(next)}
              className="mt-3"
              itemClassName="bg-muted"
              activeClassName="text-primary-foreground"
              inactiveClassName="text-muted-foreground"
              indicatorClassName="bg-primary"
            />
          </div>
          <div className="mt-4 border-t border-border/60 pt-4">
            <p className="section-caption">Color palette</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Choose your accent theme
            </p>
            <p className="text-xs text-muted-foreground">
              Emerald keeps today&apos;s look. Ocean gives the app a deeper blue style.
            </p>
            <SegmentedControl
              value={themePalette}
              options={themePaletteOptions}
              onValueChange={(next) =>
                setThemePalette(next === "ocean" ? "ocean" : "emerald")
              }
              className="mt-3"
              itemClassName="bg-muted"
              activeClassName="text-primary-foreground"
              inactiveClassName="text-muted-foreground"
              indicatorClassName="bg-primary"
            />
          </div>
          <div className="mt-4 border-t border-border/60 pt-4">
            <p className="section-caption">Experience transition</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Switching Nutrition ↔ Fitness
            </p>
            <p className="text-xs text-muted-foreground">
              Circular reveal is now the default. Tweak the feel below.
            </p>
            <Collapsible className="mt-3">
              <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-[14px] border border-border/60 bg-muted/50 px-3 py-2 text-xs font-semibold text-foreground">
                <span>Advanced tuning</span>
                <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-4 rounded-[16px] border border-border/60 bg-card px-3 py-3">
                <div>
                  <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    <span>Duration</span>
                    <span>{Math.round(experienceTransitionConfig.durationMs)} ms</span>
                  </div>
                  <Slider
                    value={[experienceTransitionConfig.durationMs]}
                    min={600}
                    max={1400}
                    step={25}
                    onValueChange={(value) =>
                      setExperienceTransitionConfig({ durationMs: value[0] })
                    }
                    className="mt-2"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    <span>Curve</span>
                    <span>{experienceTransitionConfig.curve.toFixed(2)}</span>
                  </div>
                  <Slider
                    value={[experienceTransitionConfig.curve]}
                    min={0.9}
                    max={1.35}
                    step={0.01}
                    onValueChange={(value) =>
                      setExperienceTransitionConfig({ curve: value[0] })
                    }
                    className="mt-2"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    <span>Origin</span>
                    <span>{Math.round(experienceTransitionConfig.originY * 100)}%</span>
                  </div>
                  <Slider
                    value={[experienceTransitionConfig.originY]}
                    min={0.12}
                    max={0.3}
                    step={0.01}
                    onValueChange={(value) =>
                      setExperienceTransitionConfig({ originY: value[0] })
                    }
                    className="mt-2"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    <span>Radius</span>
                    <span>{Math.round(experienceTransitionConfig.radiusPct)}%</span>
                  </div>
                  <Slider
                    value={[experienceTransitionConfig.radiusPct]}
                    min={140}
                    max={220}
                    step={5}
                    onValueChange={(value) =>
                      setExperienceTransitionConfig({ radiusPct: value[0] })
                    }
                    className="mt-2"
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
