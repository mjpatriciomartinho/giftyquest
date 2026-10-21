import {
  Armchair, Ban, Bookmark, BookOpen, CalendarHeart, Camera, Compass, Candy, Check, ChefHat, CircleCheck, Coffee,
  Dice5, Disc3, ExternalLink, Flower2, Gift, Heart, Info, Keyboard, Lamp, Leaf, Mic, Moon, NotebookPen,
  Package, Palette, Pencil, Plus, RotateCcw, Ruler, Send, ShoppingCart, Shovel, Soup, Sparkles, Sun,
  Ticket, Trash2, TrendingUp, Users, UserPlus, Utensils, Watch, Waves, X, type LucideIcon,
} from "lucide-react";

// Icons that data can reference by name (gift ideas, gift history). Keep this list small
// so the bundle only ships what we use.
const BY_NAME: Record<string, LucideIcon> = {
  armchair: Armchair, "book-open": BookOpen, camera: Camera, candy: Candy, "chef-hat": ChefHat, coffee: Coffee,
  "dice-5": Dice5, "disc-3": Disc3, "flower-2": Flower2, gift: Gift, lamp: Lamp, moon: Moon, package: Package,
  palette: Palette, shovel: Shovel, soup: Soup, sparkles: Sparkles, sun: Sun, ticket: Ticket, utensils: Utensils,
  watch: Watch, waves: Waves,
};

export function NamedIcon({ name, className }: { name: string; className?: string }) {
  const Icon = BY_NAME[name] ?? Gift;
  return <Icon className={className} aria-hidden />;
}

export {
  Ban, Bookmark, CalendarHeart, Check, Compass, CircleCheck, ExternalLink, Gift, Heart, Info, Keyboard, Leaf, Mic,
  NotebookPen, Pencil, Plus, RotateCcw, Ruler, Send, ShoppingCart, Sparkles, Trash2, TrendingUp, Users,
  UserPlus, X,
};
