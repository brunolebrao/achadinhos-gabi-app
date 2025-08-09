import { ContentTemplate, TemplateElement, Platform, Dimensions } from './types'

export class TemplateEngine {
  private templates: Map<string, ContentTemplate> = new Map()

  registerTemplate(template: ContentTemplate): void {
    this.templates.set(template.id, template)
  }

  getTemplate(id: string): ContentTemplate | undefined {
    return this.templates.get(id)
  }

  async renderTemplate(
    templateId: string,
    data: Record<string, any>
  ): Promise<string> {
    const template = this.templates.get(templateId)
    if (!template) {
      throw new Error(`Template ${templateId} not found`)
    }

    let html = this.generateBaseHTML(template)
    
    // Replace variables in template
    for (const [key, value] of Object.entries(data)) {
      html = html.replace(new RegExp(`{{${key}}}`, 'g'), String(value))
    }

    return html
  }

  private generateBaseHTML(template: ContentTemplate): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              width: ${template.dimensions.width}px;
              height: ${template.dimensions.height}px;
              background: ${template.backgroundColor || '#ffffff'};
              margin: 0;
              padding: 0;
              position: relative;
            }
            .element {
              position: absolute;
            }
          </style>
        </head>
        <body>
          ${template.elements.map(el => this.renderElement(el)).join('')}
        </body>
      </html>
    `
  }

  private renderElement(element: TemplateElement): string {
    const style = `
      left: ${element.position.x}px;
      top: ${element.position.y}px;
      ${element.size ? `width: ${element.size.width}px; height: ${element.size.height}px;` : ''}
    `

    switch (element.type) {
      case 'text':
        return `<div class="element" style="${style}">${element.content || ''}</div>`
      case 'image':
        return `<img class="element" style="${style}" src="${element.content || ''}" />`
      case 'shape':
        return `<div class="element" style="${style}; background: ${element.style?.color || '#000'};"></div>`
      default:
        return ''
    }
  }

  createDefaultTemplates(): void {
    // Instagram Post Template
    this.registerTemplate({
      id: 'instagram-post-default',
      name: 'Instagram Post Default',
      platform: 'instagram',
      type: 'image',
      dimensions: { width: 1080, height: 1080 },
      backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      elements: [
        {
          id: 'title',
          type: 'text',
          position: { x: 540, y: 200 },
          content: '{{title}}',
          style: { fontSize: '48px', color: 'white', textAlign: 'center' }
        },
        {
          id: 'price',
          type: 'text',
          position: { x: 540, y: 800 },
          content: 'R$ {{price}}',
          style: { fontSize: '72px', color: '#4CAF50', textAlign: 'center' }
        }
      ]
    })

    // TikTok Video Template
    this.registerTemplate({
      id: 'tiktok-video-default',
      name: 'TikTok Video Default',
      platform: 'tiktok',
      type: 'video',
      dimensions: { width: 1080, height: 1920 },
      backgroundColor: '#000000',
      elements: [
        {
          id: 'title',
          type: 'text',
          position: { x: 540, y: 960 },
          content: '{{title}}',
          style: { fontSize: '56px', color: 'white', textAlign: 'center' }
        }
      ]
    })

    // WhatsApp Status Template
    this.registerTemplate({
      id: 'whatsapp-status-default',
      name: 'WhatsApp Status Default',
      platform: 'whatsapp',
      type: 'image',
      dimensions: { width: 1080, height: 1920 },
      backgroundColor: '#075e54',
      elements: [
        {
          id: 'message',
          type: 'text',
          position: { x: 540, y: 960 },
          content: '{{message}}',
          style: { fontSize: '42px', color: 'white', textAlign: 'center' }
        }
      ]
    })
  }
}