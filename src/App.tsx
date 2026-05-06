/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  Camera, 
  History, 
  Settings as SettingsIcon, 
  Plus, 
  Trash2, 
  ChevronRight, 
  X, 
  Loader2, 
  Check, 
  Edit2, 
  Info,
  Calendar,
  ChefHat
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { MealItem, Nutrition, DailyGoals, DEFAULT_GOALS } from "./types";
import { analyzeMealImage } from "./services/geminiService";

// Helper to get today's date key
const getTodayKey = () => new Date().toISOString().split("T")[0];

export default function App() {
  // --- State ---
  const [meals, setMeals] = useState<MealItem[]>([]);
  const [goals, setGoals] = useState<DailyGoals>(DEFAULT_GOALS);
  const [activeTab, setActiveTab] = useState<"dashboard" | "history" | "settings">("dashboard");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [editingMeal, setEditingMeal] = useState<MealItem | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Persistence ---
  useEffect(() => {
    const savedMeals = localStorage.getItem("nt_meals");
    const savedGoals = localStorage.getItem("nt_goals");
    if (savedMeals) setMeals(JSON.parse(savedMeals));
    if (savedGoals) setGoals(JSON.parse(savedGoals));
  }, []);

  useEffect(() => {
    localStorage.setItem("nt_meals", JSON.stringify(meals));
  }, [meals]);

  useEffect(() => {
    localStorage.setItem("nt_goals", JSON.stringify(goals));
  }, [goals]);

  // --- Handlers ---
  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setPreviewImage(base64);
      setIsAnalyzing(true);

      try {
        const result = await analyzeMealImage(base64);
        const newMeal: MealItem = {
          name: result.name,
          portionGrams: result.portionGrams,
          nutrition: result.nutrition,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          imageUrl: base64
        };
        setMeals(prev => [newMeal, ...prev]);
        setEditingMeal(newMeal);
      } catch (error) {
        console.error("Analysis failed", error);
        alert("Analyse fehlgeschlagen. Bitte versuche es erneut.");
      } finally {
        setIsAnalyzing(false);
        setPreviewImage(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const deleteMeal = (id: string) => {
    setMeals(prev => prev.filter(m => m.id !== id));
  };

  const updateMeal = (id: string, updates: Partial<MealItem>) => {
    setMeals(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  // --- Calculations ---
  const todayMeals = meals.filter(m => {
    const d = new Date(m.timestamp);
    return d.toISOString().split("T")[0] === getTodayKey();
  });

  const totals = todayMeals.reduce((acc, m) => ({
    calories: acc.calories + m.nutrition.calories,
    protein: acc.protein + m.nutrition.protein,
    carbs: acc.carbs + m.nutrition.carbs,
    fat: acc.fat + m.nutrition.fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  // --- Render Helpers ---
  const ProgressBar = ({ label, current, goal, color }: { label: string, current: number, goal: number, color: string }) => {
    const percentage = Math.min(100, (current / goal) * 100);
    return (
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>
          <span className="text-gray-500 dark:text-gray-400">{Math.round(current)} / {goal} {label === "Kalorien" ? "kcal" : "g"}</span>
        </div>
        <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            className={`h-full ${color}`}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-natural-bg text-natural-text pb-24 font-sans transition-colors duration-300">
      {/* Header */}
      <header className="p-6 pb-4 border-b border-natural-beige-border bg-natural-card sticky top-0 z-20">
        <div className="flex justify-between items-center max-w-lg mx-auto">
          <div>
            <h1 className="text-2xl font-serif italic text-natural-sage">Essenstracker</h1>
            <p className="text-[10px] text-natural-muted font-medium uppercase tracking-widest mt-1">{new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="w-10 h-10 rounded-full bg-[#e0e0d6] flex items-center justify-center border border-natural-sage/20 transition-colors"
          >
            <SettingsIcon size={18} className="text-natural-sage" />
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-6 space-y-8">
        
        {activeTab === "dashboard" && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Totals Card */}
            <div className="bg-natural-card p-6 rounded-[32px] shadow-sm border border-natural-beige-border">
              <h2 className="text-sm font-semibold mb-6 flex items-center gap-2 text-natural-sage">
                <Calendar size={16} />
                Tagesübersicht
              </h2>
              <ProgressBar label="Kalorien" current={totals.calories} goal={goals.calories} color="bg-natural-sage" />
              <ProgressBar label="Protein" current={totals.protein} goal={goals.protein} color="bg-natural-sage opacity-80" />
              <ProgressBar label="Kohlenhydrate" current={totals.carbs} goal={goals.carbs} color="bg-natural-terracotta" />
              <ProgressBar label="Fett" current={totals.fat} goal={goals.fat} color="bg-natural-khaki" />
            </div>

            {/* Today List */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold text-natural-sage ml-1">Heute aufgezeichnet</h3>
                <span className="text-[10px] text-natural-muted uppercase tracking-widest">{todayMeals.length} Einträge</span>
              </div>
              
              <div className="space-y-3">
                {todayMeals.length === 0 ? (
                  <div className="text-center py-12 px-6 border-2 border-dashed border-natural-sage/20 rounded-[32px] bg-natural-sage/5">
                    <ChefHat className="mx-auto mb-2 text-natural-muted" size={32} />
                    <p className="text-sm text-natural-sage/70 italic mb-2">Bereit für das Abendessen?</p>
                    <span className="text-[10px] text-natural-muted uppercase tracking-widest">Gemini steht bereit</span>
                  </div>
                ) : (
                  todayMeals.map(meal => (
                    <motion.div 
                      key={meal.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-4 bg-natural-card p-3 rounded-2xl border border-natural-beige-border shadow-sm overflow-hidden"
                      onClick={() => setEditingMeal(meal)}
                    >
                      <div className="w-14 h-14 rounded-xl bg-[#e0e0d6] flex-shrink-0 overflow-hidden flex items-center justify-center">
                        {meal.imageUrl ? (
                          <img src={meal.imageUrl} alt={meal.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="text-xs text-natural-muted">🥑 Foto</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium truncate">{meal.name}</h4>
                        <p className="text-xs text-natural-muted">{meal.nutrition.calories} kcal • {meal.portionGrams}g</p>
                      </div>
                      <ChevronRight size={16} className="text-natural-muted" />
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "history" && (
           <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <h2 className="text-xl font-serif italic text-natural-sage mb-4 px-1">Verlauf</h2>
            {/* Simple grouping by day */}
            {[...new Set(meals.map(m => new Date(m.timestamp).toISOString().split("T")[0]))].slice(0, 7).map((dateKey: string) => {
              const dayMeals = meals.filter(m => new Date(m.timestamp).toISOString().split("T")[0] === dateKey);
              const dayTotal = dayMeals.reduce((sum, m) => sum + m.nutrition.calories, 0);
              return (
                <div key={dateKey} className="bg-natural-card rounded-[24px] p-4 border border-natural-beige-border shadow-sm">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-semibold text-sm">{new Date(dateKey).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                    <span className="text-natural-sage font-bold text-sm">{Math.round(dayTotal)} kcal</span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {dayMeals.map(m => (
                      <div key={m.id} className="w-10 h-10 rounded-lg bg-[#e0e0d6] flex-shrink-0 overflow-hidden">
                         {m.imageUrl && <img src={m.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </main>

      {/* Navigation and Bottom FAB */}
      <div className="fixed bottom-8 left-0 right-0 flex justify-center px-6 z-30 pointer-events-none">
        <div className="bg-natural-charcoal rounded-full py-2 px-8 flex items-center space-x-12 shadow-xl pointer-events-auto relative">
          <button 
            onClick={() => setActiveTab("dashboard")}
            className={`transition-colors p-2 ${activeTab === "dashboard" ? "text-natural-card" : "text-natural-khaki"}`}
          >
            <Plus size={24} />
          </button>
          
          <div className="relative">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-14 h-14 bg-natural-sage rounded-full flex items-center justify-center -translate-y-8 border-4 border-natural-card shadow-lg active:scale-90 transition-transform"
            >
              <Camera size={24} className="text-white" />
            </button>
          </div>

          <button 
            onClick={() => setActiveTab("history")}
            className={`transition-colors p-2 ${activeTab === "history" ? "text-natural-card" : "text-natural-khaki"}`}
          >
            <History size={24} />
          </button>
        </div>
        
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*" 
          capture="environment"
          onChange={handleImageCapture}
        />
      </div>

      {/* Analyzing Overlay */}
      <AnimatePresence>
        {isAnalyzing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-natural-charcoal/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
          >
            {previewImage && (
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-64 h-64 rounded-[48px] overflow-hidden mb-8 border-4 border-natural-sage/30 shadow-2xl"
              >
                <img src={previewImage} className="w-full h-full object-cover" />
              </motion.div>
            )}
            <Loader2 className="animate-spin text-natural-sage mb-4" size={48} />
            <h2 className="text-xl font-serif italic text-natural-card mb-2">KI analysiert Mahlzeit...</h2>
            <p className="text-natural-khaki max-w-xs italic text-sm">Bestimme Lebensmittel und Nährwerte. Bitte einen Moment Geduld.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit/Detail Modal */}
      <AnimatePresence>
        {editingMeal && (
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-0 z-40 bg-natural-bg flex flex-col pt-4 overflow-y-auto"
          >
            <div className="flex justify-between items-center px-6 mb-4">
              <button onClick={() => setEditingMeal(null)} className="p-2 bg-[#e0e0d6] rounded-full"><X size={20} className="text-natural-sage" /></button>
              <h3 className="font-serif italic text-natural-sage text-lg">Mahlzeit Details</h3>
              <button onClick={() => setEditingMeal(null)} className="p-2 text-natural-sage font-bold">Speichern</button>
            </div>
            
            <div className="px-6 space-y-6 pb-32 overflow-y-auto">
              <div className="w-full h-56 rounded-[40px] bg-[#e0e0d6] overflow-hidden relative border-4 border-natural-card shadow-sm">
                {editingMeal.imageUrl && <img src={editingMeal.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />}
                <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/60 to-transparent">
                   <input 
                    className="w-full bg-transparent text-white text-xl font-bold focus:outline-none placeholder:text-white/50"
                    value={editingMeal.name}
                    onChange={(e) => updateMeal(editingMeal.id, { name: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-natural-card border border-natural-beige-border p-4 rounded-3xl shadow-sm">
                  <p className="text-[10px] uppercase font-bold text-natural-muted mb-1 tracking-widest text-center">Energie</p>
                  <div className="flex items-center justify-center gap-1">
                    <input 
                      type="number"
                      className="bg-transparent text-xl font-bold focus:outline-none w-16 text-center text-natural-sage"
                      value={editingMeal.nutrition.calories}
                      onChange={(e) => updateMeal(editingMeal.id, { nutrition: { ...editingMeal.nutrition, calories: Number(e.target.value) } })}
                    />
                    <span className="text-xs text-natural-muted">kcal</span>
                  </div>
                </div>
                <div className="bg-natural-card border border-natural-beige-border p-4 rounded-3xl shadow-sm">
                  <p className="text-[10px] uppercase font-bold text-natural-muted mb-1 tracking-widest text-center">Portion</p>
                  <div className="flex items-center justify-center gap-1">
                    <input 
                      type="number"
                      className="bg-transparent text-xl font-bold focus:outline-none w-16 text-center text-natural-sage"
                      value={editingMeal.portionGrams}
                      onChange={(e) => updateMeal(editingMeal.id, { portionGrams: Number(e.target.value) })}
                    />
                    <span className="text-xs text-natural-muted">g</span>
                  </div>
                </div>
              </div>

              <div className="bg-natural-card border border-natural-beige-border p-6 rounded-[32px] shadow-sm space-y-6">
                <h4 className="text-xs uppercase tracking-widest font-bold text-natural-muted flex items-center gap-2"><Info size={14} className="text-natural-sage" /> Makronährstoffe</h4>
                
                <div className="space-y-4">
                  {/* Protein */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Protein</span>
                    <div className="flex items-center gap-2">
                       <input 
                        type="number"
                        className="w-16 text-right bg-natural-bg rounded-lg p-2 focus:outline-none text-sm font-bold text-natural-sage"
                        value={editingMeal.nutrition.protein}
                        onChange={(e) => updateMeal(editingMeal.id, { nutrition: { ...editingMeal.nutrition, protein: Number(e.target.value) } })}
                      />
                      <span className="text-xs text-natural-muted w-4">g</span>
                    </div>
                  </div>
                  {/* Carbs */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Kohlenhydrate</span>
                    <div className="flex items-center gap-2">
                       <input 
                        type="number"
                        className="w-16 text-right bg-natural-bg rounded-lg p-2 focus:outline-none text-sm font-bold text-natural-terracotta"
                        value={editingMeal.nutrition.carbs}
                        onChange={(e) => updateMeal(editingMeal.id, { nutrition: { ...editingMeal.nutrition, carbs: Number(e.target.value) } })}
                      />
                      <span className="text-xs text-natural-muted w-4">g</span>
                    </div>
                  </div>
                  {/* Fat */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Fett</span>
                    <div className="flex items-center gap-2">
                       <input 
                        type="number"
                        className="w-16 text-right bg-natural-bg rounded-lg p-2 focus:outline-none text-sm font-bold text-natural-khaki"
                        value={editingMeal.nutrition.fat}
                        onChange={(e) => updateMeal(editingMeal.id, { nutrition: { ...editingMeal.nutrition, fat: Number(e.target.value) } })}
                      />
                      <span className="text-xs text-natural-muted w-4">g</span>
                    </div>
                  </div>

                   <div className="h-px bg-natural-beige-border my-2" />

                  {/* Fiber */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-natural-muted">Ballaststoffe</span>
                    <div className="flex items-center gap-2">
                       <input 
                        type="number"
                        className="w-16 text-right bg-natural-bg rounded-lg p-1 px-2 focus:outline-none text-xs font-semibold"
                        value={editingMeal.nutrition.fiber}
                        onChange={(e) => updateMeal(editingMeal.id, { nutrition: { ...editingMeal.nutrition, fiber: Number(e.target.value) } })}
                      />
                      <span className="text-[10px] text-natural-muted w-4">g</span>
                    </div>
                  </div>
                  {/* Salt */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-natural-muted">Salz</span>
                    <div className="flex items-center gap-2">
                       <input 
                        type="number"
                        step="0.1"
                        className="w-16 text-right bg-natural-bg rounded-lg p-1 px-2 focus:outline-none text-xs font-semibold"
                        value={editingMeal.nutrition.salt}
                        onChange={(e) => updateMeal(editingMeal.id, { nutrition: { ...editingMeal.nutrition, salt: Number(e.target.value) } })}
                      />
                      <span className="text-[10px] text-natural-muted w-4">g</span>
                    </div>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => {
                  deleteMeal(editingMeal.id);
                  setEditingMeal(null);
                }}
                className="w-full py-4 text-natural-muted font-bold bg-natural-charcoal/5 border border-natural-charcoal/10 rounded-[24px] flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <Trash2 size={20} /> Eintrag löschen
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-natural-charcoal/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={() => setIsSettingsOpen(false)}
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              className="bg-natural-card w-full max-w-sm rounded-[48px] p-10 space-y-8 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-serif italic text-natural-sage">Tägliche Ziele</h3>
                <button onClick={() => setIsSettingsOpen(false)} className="p-2 bg-[#e0e0d6] rounded-full"><X size={16} className="text-natural-sage" /></button>
              </div>

              <div className="space-y-5">
                {Object.keys(goals).map((key) => (
                  <div key={key} className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-natural-muted ml-2 tracking-widest">
                      {key === 'calories' ? 'Kalorien (kcal)' : 
                       key === 'protein' ? 'Protein (g)' :
                       key === 'carbs' ? 'Kohlenhydrate (g)' : 'Fett (g)'}
                    </label>
                    <input 
                      type="number"
                      className="w-full p-4 bg-natural-bg rounded-2xl border border-natural-beige-border outline-none focus:ring-2 ring-natural-sage/30 text-natural-sage font-bold"
                      value={(goals as any)[key]}
                      onChange={(e) => setGoals(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                    />
                  </div>
                ))}
              </div>

              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="w-full py-4 bg-natural-sage hover:bg-natural-sage/90 text-white font-bold rounded-2xl shadow-xl shadow-natural-sage/20 active:scale-95 transition-all uppercase tracking-widest text-xs"
              >
                Änderungen speichern
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

