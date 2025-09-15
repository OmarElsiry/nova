// Simple wallet analysis script
const walletAddress = 'UQD02zG8T6RwuvrigCp6jkfl3WRYhj1Dh1HsBnZ0EtK2e0NH';

async function analyzeWallet(address) {
    console.log(`\n🔍 Analyzing TON Wallet: ${address}\n`);
    
    try {
        // Get basic address information
        const infoResponse = await fetch(`https://toncenter.com/api/v2/getAddressInformation?address=${address}`);
        const infoData = await infoResponse.json();
        
        if (infoData.ok) {
            const balance = (parseInt(infoData.result.balance) / 1000000000).toFixed(4);
            console.log(`💰 Current Balance: ${balance} TON`);
            console.log(`📊 Account State: ${infoData.result.state}`);
            
            if (infoData.result.last_transaction_id) {
                const lastTx = infoData.result.last_transaction_id;
                console.log(`🔗 Last Transaction: ${lastTx.hash}`);
            }
        }
        
        // Get transaction history
        const txResponse = await fetch(`https://toncenter.com/api/v2/getTransactions?address=${address}&limit=10`);
        const txData = await txResponse.json();
        
        if (txData.ok && txData.result.length > 0) {
            console.log(`\n📋 Recent Transactions (${txData.result.length}):`);
            
            let totalReceived = 0;
            let totalSent = 0;
            
            txData.result.forEach((tx, index) => {
                const timestamp = new Date(tx.utime * 1000);
                const value = tx.in_msg?.value ? (parseInt(tx.in_msg.value) / 1000000000) : 0;
                
                if (value > 0) {
                    totalReceived += value;
                    console.log(`  ${index + 1}. 📥 Received ${value.toFixed(4)} TON on ${timestamp.toLocaleDateString()}`);
                    if (tx.in_msg?.source) {
                        console.log(`     From: ${tx.in_msg.source}`);
                    }
                } else if (tx.out_msgs && tx.out_msgs.length > 0) {
                    const outValue = tx.out_msgs[0].value ? (parseInt(tx.out_msgs[0].value) / 1000000000) : 0;
                    totalSent += outValue;
                    console.log(`  ${index + 1}. 📤 Sent ${outValue.toFixed(4)} TON on ${timestamp.toLocaleDateString()}`);
                    if (tx.out_msgs[0].destination) {
                        console.log(`     To: ${tx.out_msgs[0].destination}`);
                    }
                }
            });
            
            console.log(`\n📊 Transaction Summary:`);
            console.log(`   Total Received: ${totalReceived.toFixed(4)} TON`);
            console.log(`   Total Sent: ${totalSent.toFixed(4)} TON`);
            console.log(`   Net Flow: ${(totalReceived - totalSent).toFixed(4)} TON`);
            
            // Analyze activity pattern
            const firstTx = txData.result[txData.result.length - 1];
            const lastTx = txData.result[0];
            const firstDate = new Date(firstTx.utime * 1000);
            const lastDate = new Date(lastTx.utime * 1000);
            
            console.log(`\n⏰ Activity Period:`);
            console.log(`   First Activity: ${firstDate.toLocaleDateString()}`);
            console.log(`   Last Activity: ${lastDate.toLocaleDateString()}`);
            
            const daysSinceLastActivity = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
            console.log(`   Days Since Last Activity: ${Math.floor(daysSinceLastActivity)}`);
            
            // Determine wallet type
            console.log(`\n🏷️  Wallet Analysis:`);
            if (txData.result.length > 100) {
                console.log(`   Type: Likely Exchange/Service (High transaction volume)`);
            } else if (totalReceived > 1000) {
                console.log(`   Type: Likely Business/Service (High value received)`);
            } else if (txData.result.length > 10) {
                console.log(`   Type: Active Personal Wallet`);
            } else {
                console.log(`   Type: Personal Wallet (Low activity)`);
            }
            
            if (daysSinceLastActivity < 7) {
                console.log(`   Status: 🟢 Active (Recent transactions)`);
            } else if (daysSinceLastActivity < 30) {
                console.log(`   Status: 🟡 Moderately Active`);
            } else {
                console.log(`   Status: 🔴 Inactive (No recent activity)`);
            }
            
        } else {
            console.log(`\n❌ No transaction history found or wallet is new`);
        }
        
    } catch (error) {
        console.error(`❌ Error analyzing wallet: ${error.message}`);
    }
}

// Run the analysis
analyzeWallet(walletAddress);
