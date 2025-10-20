'use client'

import { useState, useRef, useEffect } from 'react'

interface FoodItem {
  name: string
  quantity: string
  protein: number
}

interface MealAnalysis {
  foods: FoodItem[]
  totalProtein: number
  timestamp: string
}

export default function Home() {
  const [apiKey, setApiKey] = useState('')
  const [weight, setWeight] = useState(70)
  const [goal, setGoal] = useState<'maintain' | 'gain' | 'lose'>('maintain')
  const [dailyGoal, setDailyGoal] = useState(112)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [analyzing, setAnalyzing] = useState(false)
  const [currentAnalysis, setCurrentAnalysis] = useState<MealAnalysis | null>(null)
  const [mealHistory, setMealHistory] = useState<MealAnalysis[]>([])
  const [dailyTotal, setDailyTotal] = useState(0)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const multiplier = goal === 'gain' ? 2.0 : goal === 'maintain' ? 1.6 : 1.2
    setDailyGoal(Math.round(weight * multiplier))
  }, [weight, goal])

  useEffect(() => {
    const total = mealHistory.reduce((sum, meal) => sum + meal.totalProtein, 0)
    setDailyTotal(total)
  }, [mealHistory])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      setError('')
      setCurrentAnalysis(null)
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const analyzeImage = async () => {
    if (!selectedFile || !apiKey) {
      setError('Please provide an OpenAI API key and select an image')
      return
    }

    setAnalyzing(true)
    setError('')

    try {
      const reader = new FileReader()
      reader.readAsDataURL(selectedFile)

      reader.onloadend = async () => {
        const base64Image = reader.result as string

        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image: base64Image,
            apiKey: apiKey,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to analyze image')
        }

        const data = await response.json()

        const analysis: MealAnalysis = {
          foods: data.foods,
          totalProtein: data.totalProtein,
          timestamp: new Date().toLocaleString(),
        }

        setCurrentAnalysis(analysis)
        setMealHistory(prev => [...prev, analysis])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze image')
    } finally {
      setAnalyzing(false)
    }
  }

  const resetDay = () => {
    setMealHistory([])
    setCurrentAnalysis(null)
    setSelectedFile(null)
    setPreviewUrl('')
  }

  const progressPercentage = Math.min((dailyTotal / dailyGoal) * 100, 100)
  const remaining = Math.max(dailyGoal - dailyTotal, 0)

  return (
    <div className="container">
      <h1>🍗 AI Protein Tracker</h1>
      <p className="subtitle">Track your daily protein intake with AI-powered meal analysis</p>

      <div className="api-key-section">
        <h3>🔑 OpenAI API Key Required</h3>
        <p>Enter your OpenAI API key to enable meal analysis. Get one at <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" style={{color: '#667eea', fontWeight: 'bold'}}>platform.openai.com</a></p>
        <input
          type="password"
          className="api-key-input"
          placeholder="sk-..."
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
      </div>

      <div className="config-section">
        <h2>⚙️ Your Profile</h2>
        <div className="config-grid">
          <div className="input-group">
            <label>Weight (kg)</label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              min="30"
              max="200"
            />
          </div>
          <div className="input-group">
            <label>Fitness Goal</label>
            <select value={goal} onChange={(e) => setGoal(e.target.value as any)}>
              <option value="lose">Lose Weight</option>
              <option value="maintain">Maintain</option>
              <option value="gain">Gain Muscle</option>
            </select>
          </div>
        </div>
        <div className="goal-display">
          Daily Protein Goal: {dailyGoal}g
        </div>
      </div>

      <div className={`upload-section ${!apiKey ? 'disabled' : ''}`} onClick={handleUploadClick}>
        <div className="upload-icon">📸</div>
        <p>{selectedFile ? selectedFile.name : 'Click to upload meal photo'}</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="file-input"
          disabled={!apiKey}
        />
      </div>

      {previewUrl && (
        <div className="preview-section">
          <img src={previewUrl} alt="Meal preview" className="preview-image" />
          <button
            className="analyze-btn"
            onClick={analyzeImage}
            disabled={analyzing || !apiKey}
          >
            {analyzing ? (
              <>
                Analyzing<span className="loading">⏳</span>
              </>
            ) : (
              '🔍 Analyze Meal'
            )}
          </button>
        </div>
      )}

      {error && (
        <div className="error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {currentAnalysis && (
        <div className="results-section">
          <h2>📊 Analysis Results</h2>

          <div className="food-items">
            {currentAnalysis.foods.map((food, index) => (
              <div key={index} className="food-item">
                <div>
                  <div className="food-name">{food.name}</div>
                  <div className="food-details">{food.quantity}</div>
                </div>
                <div className="food-protein">{food.protein}g</div>
              </div>
            ))}
          </div>

          <div className="meal-total">
            <h3>Total Protein in This Meal</h3>
            <div className="amount">{currentAnalysis.totalProtein}g</div>
          </div>
        </div>
      )}

      {mealHistory.length > 0 && (
        <div className="daily-progress">
          <h3>📈 Daily Progress</h3>
          <div className="progress-bar-container">
            <div className="progress-bar" style={{ width: `${progressPercentage}%` }}>
              {dailyTotal}g / {dailyGoal}g
            </div>
          </div>
          <div className="feedback">
            {dailyTotal >= dailyGoal ? (
              <span style={{ color: '#28a745', fontWeight: 'bold' }}>
                🎉 Congratulations! You've reached your daily protein goal!
              </span>
            ) : (
              <span>
                You need <strong>{remaining}g</strong> more protein to reach your daily target.
              </span>
            )}
          </div>

          {dailyTotal < dailyGoal && (
            <div className="suggestions">
              <h4>💡 High-Protein Food Suggestions:</h4>
              <p>Try adding: Chicken breast (31g per 100g), Paneer (18g per 100g), Greek yogurt (10g per 100g), Eggs (13g per 100g), Lentils (9g per 100g), or a protein shake (20-30g per serving)</p>
            </div>
          )}

          <button className="reset-btn" onClick={resetDay}>
            🔄 Reset Daily Tracker
          </button>
        </div>
      )}

      {mealHistory.length > 0 && (
        <div className="history-section">
          <h2>📝 Today's Meal History</h2>
          {mealHistory.map((meal, index) => (
            <div key={index} className="history-item">
              <div className="time">🕒 {meal.timestamp}</div>
              <div className="protein-amount">+{meal.totalProtein}g protein</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
