import type { ManifestModel } from './ModelLoader.ts'
import { t } from './i18n.ts'

const modelsListContainer = document.getElementById('models-list')!
const searchInput = document.getElementById('model-search') as HTMLInputElement
const categoryChipsContainer = document.getElementById('category-chips')!

let brandMap = new Map<string, ManifestModel[]>()
let allModels: ManifestModel[] = []
let activeCategory: string | null = null
let onModelSelect: (id: string) => void = () => {}

function getFilteredModels(): ManifestModel[] {
  const query = searchInput.value.trim().toLowerCase()
  return allModels.filter(m => {
    if (activeCategory && m.category !== activeCategory) return false
    if (query && !m.name.toLowerCase().includes(query) && !m.brand.toLowerCase().includes(query) && !m.id.toLowerCase().includes(query)) return false
    return true
  })
}

function buildBrandMap(models: ManifestModel[]): Map<string, ManifestModel[]> {
  const map = new Map<string, ManifestModel[]>()
  for (const model of models) {
    const list = map.get(model.brand) ?? []
    list.push(model)
    map.set(model.brand, list)
  }
  return map
}

function isFiltering(): boolean {
  return activeCategory !== null || searchInput.value.trim() !== ''
}

export function showBrandGrid() {
  const filtered = getFilteredModels()
  const currentBrandMap = buildBrandMap(filtered)
  const sortedBrands = [...currentBrandMap.keys()].sort()

  // If filtering, show flat list instead of brand grid
  if (isFiltering()) {
    showFlatResults(filtered)
    return
  }

  const grid = document.createElement('div')
  grid.className = 'brand-grid models-view'

  for (const brand of sortedBrands) {
    const brandSlug = brand.replace(/\s+/g, '-').toLowerCase()
    const count = currentBrandMap.get(brand)!.length

    const tile = document.createElement('button')
    tile.className = 'brand-tile'
    tile.addEventListener('click', () => showBrandRobots(brand))

    const img = document.createElement('img')
    img.src = `${(import.meta as any).env.BASE_URL}images/logos/${brandSlug}.png`
    img.alt = brand
    img.onerror = () => {
      img.remove()
      const fallback = document.createElement('div')
      fallback.className = 'brand-icon-fallback'
      fallback.textContent = brand.slice(0, 2).toUpperCase()
      tile.insertBefore(fallback, tile.firstChild)
    }
    tile.appendChild(img)

    const name = document.createElement('span')
    name.textContent = brand
    tile.appendChild(name)

    const countEl = document.createElement('span')
    countEl.className = 'brand-count'
    countEl.textContent = count === 1 ? t('models.count.one') : t('models.count.other', { n: count })
    tile.appendChild(countEl)

    grid.appendChild(tile)
  }

  modelsListContainer.innerHTML = ''
  modelsListContainer.appendChild(grid)
}

function showFlatResults(models: ManifestModel[]) {
  const view = document.createElement('div')
  view.className = 'models-view'

  const countLabel = document.createElement('div')
  countLabel.className = 'filter-count'
  countLabel.textContent = models.length === 1 ? t('results.count.one') : t('results.count.other', { n: models.length })
  view.appendChild(countLabel)

  const ul = document.createElement('ul')
  ul.className = 'model-list'
  for (const model of models) {
    const li = document.createElement('li')
    li.id = model.id
    const a = document.createElement('a')
    a.href = '#!'
    a.innerHTML = `<span class="result-name">${model.name}</span><span class="result-brand">${model.brand}</span>`
    a.addEventListener('click', () => onModelSelect(model.id))
    li.appendChild(a)
    ul.appendChild(li)
  }
  view.appendChild(ul)

  modelsListContainer.innerHTML = ''
  modelsListContainer.appendChild(view)
}

function showBrandRobots(brand: string) {
  const brandSlug = brand.replace(/\s+/g, '-').toLowerCase()
  const models = brandMap.get(brand)!

  const view = document.createElement('div')
  view.className = 'models-view'

  // Back button
  const back = document.createElement('button')
  back.className = 'brand-back'
  back.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`

  const backImg = document.createElement('img')
  backImg.src = `${(import.meta as any).env.BASE_URL}images/logos/${brandSlug}.png`
  backImg.alt = brand
  backImg.onerror = () => backImg.remove()
  back.appendChild(backImg)

  const backName = document.createElement('span')
  backName.className = 'brand-name'
  backName.textContent = brand
  back.appendChild(backName)

  back.addEventListener('click', showBrandGrid)
  view.appendChild(back)

  // Robot list
  const ul = document.createElement('ul')
  ul.className = 'model-list'
  for (const model of models) {
    const li = document.createElement('li')
    li.id = model.id
    const a = document.createElement('a')
    a.href = '#!'
    a.textContent = model.name
    a.addEventListener('click', () => onModelSelect(model.id))
    li.appendChild(a)
    ul.appendChild(li)
  }
  view.appendChild(ul)

  modelsListContainer.innerHTML = ''
  modelsListContainer.appendChild(view)
}

export function setupCategoryChips() {
  const categories = [...new Set(allModels.map(m => m.category))].sort()
  categoryChipsContainer.innerHTML = ''
  for (const cat of categories) {
    const chip = document.createElement('button')
    chip.className = 'category-chip'
    chip.textContent = t('category.' + cat)
    chip.addEventListener('click', () => {
      activeCategory = activeCategory === cat ? null : cat
      updateChipStates()
      showBrandGrid()
    })
    chip.dataset.category = cat
    categoryChipsContainer.appendChild(chip)
  }
}

function updateChipStates() {
  categoryChipsContainer.querySelectorAll('.category-chip').forEach(el => {
    const chip = el as HTMLElement
    chip.classList.toggle('active', chip.dataset.category === activeCategory)
  })
}

searchInput.addEventListener('input', () => showBrandGrid())

export function initGallery(models: ManifestModel[], selectModel: (id: string) => void) {
  allModels = models
  brandMap = buildBrandMap(models)
  onModelSelect = selectModel
  setupCategoryChips()
  showBrandGrid()
}
