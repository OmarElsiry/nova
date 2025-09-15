import { TonConnectButton, useTonAddress, useTonWallet } from '@tonconnect/ui-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { Wallet, RefreshCw, Copy, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const WalletConnection = () => {
  const userFriendlyAddress = useTonAddress();
  const wallet = useTonWallet();
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchBalance = async () => {
    if (!userFriendlyAddress) return;
    
    setLoading(true);
    try {
      // Using TON API to get balance
      const response = await fetch(`https://toncenter.com/api/v2/getAddressInformation?address=${userFriendlyAddress}`);
      const data = await response.json();
      
      if (data.ok) {
        const balanceNano = data.result.balance;
        const balanceTon = (parseInt(balanceNano) / 1000000000).toFixed(4);
        setBalance(balanceTon);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
      toast.error('Failed to fetch balance. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyAddress = async () => {
    if (!userFriendlyAddress) return;
    
    try {
      await navigator.clipboard.writeText(userFriendlyAddress);
      setCopied(true);
      toast.success('Wallet address copied to clipboard');
      
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  useEffect(() => {
    if (userFriendlyAddress) {
      fetchBalance();
    } else {
      setBalance(null);
    }
  }, [userFriendlyAddress]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-2xl">
            <Wallet className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white">TON Wallet</h1>
          <p className="text-white/80 text-lg">Connect your TON wallet to get started</p>
        </div>

        {/* Connection Card */}
        <Card className="backdrop-blur-sm bg-white/10 border-white/20 shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-white text-xl">Wallet Connection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!wallet ? (
              <div className="text-center space-y-4">
                <p className="text-white/80">Connect your wallet to continue</p>
                <div className="flex justify-center">
                  <TonConnectButton />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Connected
                  </Badge>
                  <TonConnectButton />
                </div>
                
                {/* Wallet Info */}
                <div className="space-y-3">
                  <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                    <p className="text-white/60 text-sm mb-1">Wallet Name</p>
                    <p className="text-white font-medium">{wallet.device.appName || 'TON Wallet'}</p>
                  </div>
                  
                  <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-white/60 text-sm">Address</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={copyAddress}
                        className="h-6 px-2 text-white/80 hover:text-white"
                      >
                        {copied ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      </Button>
                    </div>
                    <p className="text-white font-mono text-sm break-all">
                      {userFriendlyAddress}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Balance Card */}
        {wallet && (
          <Card className="backdrop-blur-sm bg-white/10 border-white/20 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-white text-xl flex items-center justify-between">
                Account Balance
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchBalance}
                  disabled={loading}
                  className="text-white/80 hover:text-white"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {balance !== null ? (
                <div className="text-center space-y-2">
                  <p className="text-4xl font-bold text-white">{balance}</p>
                  <p className="text-white/60">TON</p>
                </div>
              ) : loading ? (
                <div className="text-center space-y-2">
                  <div className="text-2xl text-white/60">Loading...</div>
                  <div className="w-8 h-8 border-2 border-white/20 border-t-white/80 rounded-full animate-spin mx-auto"></div>
                </div>
              ) : (
                <div className="text-center">
                  <Button 
                    onClick={fetchBalance}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:opacity-90 transition-opacity shadow-2xl"
                  >
                    Check Balance
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default WalletConnection;
