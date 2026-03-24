// AI Symptom Checker - Free-friendly implementation
// Uses basic symptom matching + OpenAI API if key is provided, otherwise uses fallback logic

const symptomDatabase = {
  'cold': ['cough', 'sneezing', 'runny nose', 'sore throat', 'headache'],
  'flu': ['fever', 'chills', 'cough', 'body aches', 'fatigue'],
  'allergies': ['itching', 'sneezing', 'runny nose', 'watery eyes', 'rash'],
  'headache': ['head pain', 'light sensitivity', 'nausea', 'dizziness'],
  'stomach_issues': ['nausea', 'vomiting', 'diarrhea', 'stomach pain', 'bloating'],
  'anxiety': ['nervousness', 'racing heart', 'sweating', 'trembling', 'difficulty concentrating'],
  'insomnia': ['difficulty sleeping', 'waking up frequently', 'fatigue', 'difficulty concentrating'],
  'skin_condition': ['rash', 'itching', 'redness', 'swelling', 'dryness'],
  'back_pain': ['lower back pain', 'upper back pain', 'stiffness', 'limited mobility'],
  'migraine': ['severe headache', 'sensitivity to light', 'nausea', 'vomiting', 'visual disturbances']
}

const specialistRecommendations = {
  'cold': ['General Practitioner', 'Internist'],
  'flu': ['General Practitioner', 'Internist'],
  'allergies': ['Allergist', 'Dermatologist', 'General Practitioner'],
  'headache': ['Neurologist', 'General Practitioner'],
  'stomach_issues': ['Gastroenterologist', 'General Practitioner'],
  'anxiety': ['Psychiatrist', 'Psychologist', 'General Practitioner'],
  'insomnia': ['Sleep Medicine Specialist', 'Psychiatrist', 'General Practitioner'],
  'skin_condition': ['Dermatologist', 'General Practitioner'],
  'back_pain': ['Orthopedist', 'Neurosurgeon', 'Physical Therapist', 'General Practitioner'],
  'migraine': ['Neurologist', 'General Practitioner']
}

export async function analyzeSymptoms(symptoms) {
  // Convert symptoms to lowercase string
  const symptomString = symptoms.toLowerCase()
  
  // Try OpenAI first if API key is available
  if (process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
    try {
      return await analyzeWithOpenAI(symptomString)
    } catch (err) {
      console.log('OpenAI not available, using fallback')
    }
  }

  // Fallback: Use local symptom database
  return analyzeWithFallback(symptomString)
}

async function analyzeWithOpenAI(symptoms) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a medical symptom analyzer. Analyze the user symptoms and suggest possible conditions and specialist types. Be professional and always recommend seeing a real doctor. Return JSON with fields: conditions (array), specialists (array), severity (low/medium/high), urgency (boolean), advice (string).'
        },
        {
          role: 'user',
          content: `Analyze these symptoms and suggest conditions and specialists: ${symptoms}`
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    })
  })

  if (!response.ok) {
    throw new Error('OpenAI API error')
  }

  const data = await response.json()
  const content = data.choices[0].message.content
  
  return {
    success: true,
    analysis: JSON.parse(content),
    source: 'openai'
  }
}

function analyzeWithFallback(symptoms) {
  const matches = {}
  let highestMatch = 0

  // Score each condition based on symptom matches
  Object.entries(symptomDatabase).forEach(([condition, conditionSymptoms]) => {
    let score = 0
    conditionSymptoms.forEach(symptom => {
      if (symptoms.includes(symptom)) {
        score++
      }
    })

    if (score > 0) {
      matches[condition] = {
        score,
        percentage: Math.round((score / conditionSymptoms.length) * 100)
      }
      highestMatch = Math.max(highestMatch, score)
    }
  })

  // Sort by score
  const sortedMatches = Object.entries(matches)
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 3) // Top 3 matches

  const topConditions = sortedMatches.map(([condition, data]) => ({
    condition: condition.replace(/_/g, ' '),
    confidence: `${data.percentage}%`,
    specialists: specialistRecommendations[condition] || ['General Practitioner']
  }))

  // Determine severity
  const urgentSymptoms = ['difficulty breathing', 'chest pain', 'loss of consciousness', 'severe bleeding', 'high fever']
  const urgentMatches = urgentSymptoms.filter(s => symptoms.includes(s))
  const severity = urgentMatches.length > 0 ? 'high' : highestMatch > 3 ? 'medium' : 'low'
  const needsUrgentCare = urgentMatches.length > 0

  return {
    success: true,
    analysis: {
      possibleConditions: topConditions,
      severity,
      urgency: needsUrgentCare,
      advice: needsUrgentCare 
        ? 'Your symptoms may require urgent medical attention. Please seek immediate care at an emergency room or call emergency services.'
        : 'Based on your symptoms, we recommend scheduling an appointment with one of the specialists shown above. Please note this is not a medical diagnosis - always consult with a healthcare professional.'
    },
    source: 'fallback'
  }
}

// Common symptoms for autocomplete
export const commonSymptoms = [
  'fever',
  'cough',
  'sore throat',
  'sneezing',
  'runny nose',
  'headache',
  'body aches',
  'fatigue',
  'nausea',
  'vomiting',
  'diarrhea',
  'stomach pain',
  'chest pain',
  'shortness of breath',
  'dizziness',
  'rash',
  'itching',
  'swelling',
  'back pain',
  'joint pain',
  'muscle pain',
  'anxiety',
  'difficulty sleeping',
  'loss of appetite',
  'weakness'
]

