import { ArrowLeft, Trophy, Crown, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import TonIcon from "@/components/ui/ton-icon";

// Mock data for top 100 traders
const generateTopTraders = () => {
  return Array.from({ length: 100 }, (_, i) => ({
    id: i + 1,
    rank: i + 1,
    username: `trader${i + 1}`,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=trader${i + 1}`,
    tradingVolume: Math.max(100000 - i * 800 + Math.random() * 1000, 1000),
  }));
};

const TopTraders = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const traders = generateTopTraders();
  
  const top3 = traders.slice(0, 3);
  const remaining = traders.slice(3);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-warning" />;
      case 2:
        return <Trophy className="w-5 h-5 text-muted-foreground" />;
      case 3:
        return <Award className="w-5 h-5 text-warning" />;
      default:
        return null;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "border-warning/30 bg-warning/5";
      case 2:
        return "border-muted/30 bg-muted/5";
      case 3:
        return "border-warning/20 bg-warning/5";
      default:
        return "border-border bg-surface";
    }
  };

  const getAvatarStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return "w-20 h-20 border-4 border-warning shadow-lg";
      case 2:
        return "w-16 h-16 border-3 border-muted";
      case 3:
        return "w-16 h-16 border-3 border-warning/60";
      default:
        return "w-12 h-12";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold text-text-primary">
            {t('topTradersTitle')}
          </h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Top 3 Podium */}
        <div className="bg-surface rounded-lg p-6 border border-border">
          <h2 className="text-center text-lg font-semibold text-text-primary mb-6">
            🏆 Top 3 {t('topTraders')}
          </h2>
          
          <div className="flex items-end justify-center gap-4 mb-6">
            {/* #2 - Left */}
            <div className="flex flex-col items-center">
              <div className="relative mb-2">
                <img
                  src={top3[1]?.avatar}
                  alt={top3[1]?.username}
                  className={`${getAvatarStyle(2)} rounded-full object-cover`}
                />
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-muted rounded-full flex items-center justify-center text-white text-xs font-bold">
                  2
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-text-primary truncate max-w-20">
                  {top3[1]?.username}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <TonIcon size="xs" />
                  <span className="text-xs text-text-muted">
                    {top3[1]?.tradingVolume.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* #1 - Center (Larger) */}
            <div className="flex flex-col items-center">
              <div className="relative mb-2">
                <img
                  src={top3[0]?.avatar}
                  alt={top3[0]?.username}
                  className={`${getAvatarStyle(1)} rounded-full object-cover`}
                  style={{ filter: 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.3))' }}
                />
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-warning rounded-full flex items-center justify-center text-white text-sm font-bold">
                  1
                </div>
                <Crown className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-8 h-8 text-warning" />
              </div>
              <div className="text-center">
                <p className="text-base font-semibold text-text-primary truncate max-w-24">
                  {top3[0]?.username}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <TonIcon size="sm" />
                  <span className="text-sm font-medium text-text-primary">
                    {top3[0]?.tradingVolume.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* #3 - Right */}
            <div className="flex flex-col items-center">
              <div className="relative mb-2">
                <img
                  src={top3[2]?.avatar}
                  alt={top3[2]?.username}
                  className={`${getAvatarStyle(3)} rounded-full object-cover`}
                />
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-warning/80 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  3
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-text-primary truncate max-w-20">
                  {top3[2]?.username}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <TonIcon size="xs" />
                  <span className="text-xs text-text-muted">
                    {top3[2]?.tradingVolume.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Remaining Rankings (#4-100) */}
        <div>
          <h3 className="text-lg font-semibold text-text-primary mb-4">
            Rankings #4 - #100
          </h3>
          
          <div className="space-y-2">
            {remaining.map((trader) => (
              <Card key={trader.id} className="bg-surface border-border hover:bg-accent/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Rank */}
                    <div className="w-8 text-center">
                      <span className="text-sm font-medium text-text-muted">
                        #{trader.rank}
                      </span>
                    </div>

                    {/* Avatar */}
                    <img
                      src={trader.avatar}
                      alt={trader.username}
                      className="w-10 h-10 rounded-full object-cover"
                    />

                    {/* User Info */}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-text-primary">
                        {trader.username}
                      </p>
                      <p className="text-xs text-text-muted">
                        {t('tradingVolume')}
                      </p>
                    </div>

                    {/* Trading Volume */}
                    <div className="flex items-center gap-1">
                      <TonIcon size="xs" />
                      <span className="text-sm font-medium text-text-primary">
                        {trader.tradingVolume.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopTraders;