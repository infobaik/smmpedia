// src/utils/webhook.ts
export async function sendWebhookToReseller(webhookUrl: string, apiKey: string, payloadData: any) {
  if (!webhookUrl || !apiKey) return;
  
  try {
    const payloadString = JSON.stringify(payloadData)
    
    // Keamanan tingkat Bank: Buat Signature HMAC SHA-256
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey('raw', encoder.encode(apiKey), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadString))
    
    // Konversi buffer ke hex string
    const hexSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0')).join('')

    // Kirim secara Asynchronous (Fire and Forget)
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-SMM-Signature': hexSignature 
      },
      body: payloadString
    }).catch(() => {}) // Jika server reseller mati, abaikan agar panel kita tidak terbebani
  } catch (e) {
    // Abaikan error kriptografi
  }
}
