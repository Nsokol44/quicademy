/**
 * Picks the first section (day) that isn't fully checked off for this
 * student and composes a short SMS-friendly reminder. Returns null if the
 * course has no sections yet (e.g. still being built).
 *
 * @param {{title:string}} course
 * @param {{id:string,title:string,overview:string|null,sort_order:number}[]} sections
 * @param {{id:string,section_id:string|null,title:string,sort_order:number}[]} modules
 * @param {Set<string>} completedModuleIds
 */
export function composeReminderText(course, sections, modules, completedModuleIds) {
  if (!sections?.length) return null

  const modsFor = (sectionId) =>
    modules.filter(m => m.section_id === sectionId).sort((a, b) => a.sort_order - b.sort_order)

  const orderedSections = [...sections].sort((a, b) => a.sort_order - b.sort_order)
  const isSectionComplete = (s) => {
    const mods = modsFor(s.id)
    return mods.length > 0 && mods.every(m => completedModuleIds.has(m.id))
  }

  const nextSection = orderedSections.find(s => !isSectionComplete(s))

  if (!nextSection) {
    return `${course.title}: you've checked off every day. Nice work — maybe start your next course? 🎉`
  }

  const remaining = modsFor(nextSection.id)
    .filter(m => !completedModuleIds.has(m.id))
    .slice(0, 2)
    .map(m => `- ${m.title}`)
    .join('\n')

  const parts = [
    `${course.title} — ${nextSection.title}`,
    nextSection.overview || null,
    remaining ? `Up next:\n${remaining}` : null,
  ].filter(Boolean)

  const text = parts.join('\n')
  return text.length > 480 ? `${text.slice(0, 477)}...` : text
}
