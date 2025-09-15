import { ArrowLeft, Users, DollarSign, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";

const ReferralStatistics = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { toast } = useToast();

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText('https://t.me/your_bot?start=ref_demo');
      toast({
        title: t('copied'),
        duration: 2000,
      });
    } catch (err) {
      console.error('Failed to copy: ', err);
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
            {t('referralStatistics')}
          </h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-surface border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <DollarSign className="w-8 h-8 text-success" />
                <div>
                  <p className="text-sm text-text-muted">{t('earnedTon')}</p>
                  <p className="text-2xl font-bold text-text-primary">0.08</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-surface border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <Users className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-sm text-text-muted">{t('referrals')}</p>
                  <p className="text-2xl font-bold text-text-primary">139</p>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Referral Link */}
        <Card className="bg-surface border-border">
          <CardContent className="p-4">
            <h3 className="font-medium text-text-primary mb-2">{t('referralLink')}</h3>
            <div className="relative">
              <div className="p-3 bg-muted/30 rounded-lg border border-border pr-12">
                <p className="text-xs font-mono text-text-muted break-all">
                  https://t.me/your_bot?start=ref_demo
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 p-0 glow-hover"
                onClick={copyToClipboard}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="bg-surface border-border">
          <CardContent className="p-4">
            <h3 className="font-medium text-text-primary mb-4">How it works</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  1
                </div>
                <p className="text-sm text-text-muted">{t('inviteInstruction')}</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  2
                </div>
                <p className="text-sm text-text-muted">{t('earnPercentage')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Button */}
        <Button className="w-full h-12 text-base font-medium">
          {t('inviteFriends')}
        </Button>
      </div>
    </div>
  );
};

export default ReferralStatistics;