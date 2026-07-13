require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

app.post('/client/enregistrer', async (req, res) => {
  const { salon_id, telephone, prenom, coiffeur_id, type_coupe } = req.body;
  let { data: client } = await supabase.from('clients').select('*').eq('telephone', telephone).single();
  if (!client) {
    const { data } = await supabase.from('clients').insert({ telephone, prenom }).select().single();
    client = data;
  }
  const { count } = await supabase.from('file_attente').select('*', { count: 'exact' }).eq('salon_id', salon_id).eq('statut', 'en_attente');
  const { data: file } = await supabase.from('file_attente').insert({ salon_id, client_id: client.id, coiffeur_id, type_coupe, position: (count || 0) + 1, temps_estime: ((count || 0) + 1) * 20 }).select().single();
  res.json({ success: true, position: file.position, temps_estime: file.temps_estime });
});

app.post('/coupe/terminer', async (req, res) => {
  const { file_id, salon_id, client_id, coiffeur_id, type_coupe, note } = req.body;
  await supabase.from('file_attente').update({ statut: 'termine' }).eq('id', file_id);
  await supabase.from('visites').insert({ salon_id, client_id, coiffeur_id, type_coupe, note });
  const { data: client } = await supabase.from('clients').select('nb_visites').eq('id', client_id).single();
  await supabase.from('clients').update({ nb_visites: (client.nb_visites || 0) + 1, derniere_visite: new Date().toISOString().split('T')[0], relance_envoyee: false }).eq('id', client_id);
  const { data: fidelite } = await supabase.from('fidelite').select('*').eq('client_id', client_id).eq('salon_id', salon_id).single();
  if (fidelite) {
    const nouveaux_points = fidelite.points + 1;
    await supabase.from('fidelite').update({ points: nouveaux_points, recompense_active: nouveaux_points >= 10 }).eq('id', fidelite.id);
  } else {
    await supabase.from('fidelite').insert({ client_id, salon_id, points: 1 });
  }
  res.json({ success: true });
});

app.post('/pourboire', async (req, res) => {
  const { visite_id, coiffeur_id, montant } = req.body;
  await supabase.from('pourboires').insert({ visite_id, coiffeur_id, montant, statut: 'en_attente' });
  res.json({ success: true });
});

app.post('/relances/envoyer', async (req, res) => {
  const { data: clients } = await supabase.from('clients').select('*').eq('relance_envoyee', false).lt('derniere_visite', new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  for (const client of clients || []) {
    await supabase.from('clients').update({ relance_envoyee: true }).eq('id', client.id);
  }
  res.json({ success: true, relances: clients?.length || 0 });
});


// ============ STRIPE ============
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Créer une session de checkout
app.post('/stripe/create-checkout-session', async (req, res) => {
  const { price_id, salon_id, plan, duree } = req.body;
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: price_id, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL}/gerant?subscription=success`,
      cancel_url: `${process.env.FRONTEND_URL}/gerant?subscription=cancel`,
      metadata: { salon_id, plan, duree },
    });
    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Webhook Stripe
app.post('/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { salon_id, plan, duree } = session.metadata;
    await supabase.from('salons').update({ plan }).eq('id', salon_id);
    await supabase.from('abonnements').upsert({
      salon_id,
      plan,
      duree,
      stripe_customer_id: session.customer,
      stripe_subscription_id: session.subscription,
      statut: 'actif',
      debut: new Date().toISOString(),
    });
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object;
    await supabase.from('abonnements').update({ statut: 'annule' }).eq('stripe_subscription_id', sub.id);
    await supabase.from('salons').update({ plan: 'starter' }).eq('id', sub.metadata?.salon_id);
  }

  res.json({ received: true });
});

app.get('/', (req, res) => res.json({ status: 'Dashboard Barber API running' }));

app.listen(process.env.PORT || 3000, () => console.log(`Serveur démarré sur le port ${process.env.PORT || 3000}`));
