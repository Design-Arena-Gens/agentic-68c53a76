import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

interface FoodItem {
  name: string
  quantity: string
  protein: number
}

export async function POST(request: NextRequest) {
  try {
    const { image, apiKey } = await request.json()

    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key is required' },
        { status: 400 }
      )
    }

    if (!image) {
      return NextResponse.json(
        { error: 'Image is required' },
        { status: 400 }
      )
    }

    const openai = new OpenAI({
      apiKey: apiKey,
    })

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a nutrition analysis expert specialized in identifying food items from photos and estimating protein content.

Your task:
1. Identify all visible food items in the image
2. Estimate the quantity of each food item (in grams or ml)
3. Calculate the protein content for each item based on standard nutritional data
4. Return the results in JSON format

Return ONLY valid JSON in this exact format:
{
  "foods": [
    {"name": "Chicken Breast", "quantity": "150g", "protein": 45},
    {"name": "Cooked Rice", "quantity": "200g", "protein": 4}
  ],
  "totalProtein": 49
}

Important:
- Use common Indian and international food items
- Be realistic with portion estimates
- Use standard USDA/IFCT nutritional values
- Round protein to nearest gram
- If you cannot identify food clearly, make your best estimate
- Return ONLY the JSON object, no additional text`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this meal photo and tell me the protein content of each food item.'
            },
            {
              type: 'image_url',
              image_url: {
                url: image,
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from OpenAI')
    }

    // Parse the JSON response
    let jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Invalid response format from OpenAI')
    }

    const analysisResult = JSON.parse(jsonMatch[0])

    return NextResponse.json(analysisResult)
  } catch (error: any) {
    console.error('Analysis error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to analyze image' },
      { status: 500 }
    )
  }
}
