const express = require('express');
const router = express.Router();
const User = require('../models/User');
const CycleLog = require('../models/CycleLog');
const { getCycleStats } = require('../controllers/cycleEngine');
const { calculateRisk } = require('../controllers/riskEngine');

function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

router.post('/ask', requireLogin, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.json({ reply: "Please type a question!" });

    const user = await User.findById(req.session.user.id);
    const logs = await CycleLog.find({ userId: user._id }).sort({ periodStartDate: -1 });
    const dates = logs.map(l => l.periodStartDate);
    const stats = getCycleStats(dates);
    const risk = calculateRisk(user);

    const systemPrompt = `
You are Herlytics AI — a warm, caring, and knowledgeable menstrual health assistant.
You already know this user's health data. Always use it to give personalised answers.

USER PROFILE:
- Name: ${user.name}
- Age: ${user.age || 'not set'}
- Current cycle phase: ${stats ? stats.phase.name : 'unknown'}
- Day of cycle: ${stats ? stats.dayOfCycle : 'unknown'}
- Average cycle length: ${stats ? stats.avg + ' days' : 'unknown'}
- Next period: ${stats ? stats.nextPeriod.toLocaleDateString('en-IN') : 'unknown'}
- Risk level: ${risk.level}
- Physical symptoms: ${(user.physicalSymptoms || []).join(', ') || 'none reported'}
- Emotional symptoms: ${(user.emotionalSymptoms || []).join(', ') || 'none reported'}
- Stress level: ${user.stressLevel || 'not set'}
- Sleep pattern: ${user.sleepPattern || 'not set'}
- Known conditions: ${(user.knownConditions || []).join(', ') || 'none'}
- Cycles logged: ${logs.length}

RULES:
- Keep answers short, warm and practical (3-5 sentences max)
- Always relate your answer to their current phase or symptoms when relevant
- Never diagnose — suggest seeing a doctor for serious concerns
- Use simple friendly language, no heavy medical jargon
- Respond in the same language the user writes in (Hindi or English)
- If asked something unrelated to health, gently redirect back
- Address the user by their first name occasionally to feel personal
`.trim();

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 300,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ]
      })
    });

    const data = await response.json();

    if (data.error) {
      console.log('GROQ ERROR:', data.error);
      return res.json({ reply: "I'm having trouble connecting right now. Please try again!" });
    }

    const reply = data.choices?.[0]?.message?.content || "I couldn't generate a response. Please try again.";
    res.json({ reply });

  } catch (err) {
    console.log('CHAT ERROR:', err.message);
    res.json({ reply: "Something went wrong. Please try again!" });
  }
});

module.exports = router;