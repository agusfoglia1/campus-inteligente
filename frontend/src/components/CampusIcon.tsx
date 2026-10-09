import type { SVGProps } from 'react'

export type CampusIconName =
  | 'building'
  | 'home'
  | 'qr'
  | 'books'
  | 'bookOpen'
  | 'idCard'
  | 'map'
  | 'library'
  | 'utensils'
  | 'landmark'
  | 'restroom'
  | 'flask'
  | 'pin'

const paths: Record<CampusIconName, string[]> = {
  building: ['M3 21h18', 'M5 21V5l7-3 7 3v16', 'M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01', 'M10 21v-3h4v3'],
  home: ['m3 10 9-7 9 7', 'M5 9v12h14V9', 'M9 21v-7h6v7'],
  qr: ['M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3z', 'M14 14h3v3h-3zM19 14h2M19 18v3M14 20h3'],
  books: ['M4 4h5v16H4zM10 5h5v15h-5zM16 3h4v17h-4z', 'M5.5 7h2M11.5 8h2M17 6h2'],
  bookOpen: ['M12 7v14', 'M3 5.5A2.5 2.5 0 0 1 5.5 3H12v16H5.5A2.5 2.5 0 0 0 3 21.5z', 'M21 5.5A2.5 2.5 0 0 0 18.5 3H12v16h6.5a2.5 2.5 0 0 1 2.5 2.5z'],
  idCard: ['M3 5h18v14H3z', 'M8 11a2.25 2.25 0 1 0 0-4.5A2.25 2.25 0 0 0 8 11z', 'M5 16c.6-1.7 1.6-2.5 3-2.5s2.4.8 3 2.5', 'M14 9h4M14 13h4'],
  map: ['M3 6 9 3l6 3 6-3v15l-6 3-6-3-6 3z', 'M9 3v15M15 6v15'],
  library: ['M3 10h18', 'm4 10 2-6h12l2 6', 'M5 10v10M9 10v10M15 10v10M19 10v10', 'M3 20h18M8 7h8'],
  utensils: ['M4 3v7a3 3 0 0 0 6 0V3M7 3v18', 'M17 3v18M17 3c2 2 3 4.5 3 7h-3'],
  landmark: ['M3 10h18', 'm4 10 8-7 8 7', 'M5 20V11M9 20V11M15 20V11M19 20V11', 'M3 20h18'],
  restroom: ['M7 3a2 2 0 1 0 0 .01M17 3a2 2 0 1 0 0 .01', 'M4 7h6l2 7H9l1 7H5l1-7H3z', 'M15 7h4l3 14h-4l-1-7-1 7h-4z'],
  flask: ['M9 3h6M10 3v6l-5.5 9.5A2.3 2.3 0 0 0 6.5 22h11a2.3 2.3 0 0 0 2-3.5L14 9V3', 'M7.5 16h9'],
  pin: ['M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0z', 'M12 10a2.5 2.5 0 1 0 0 .01'],
}

export function campusIconSvg(name: CampusIconName, color = 'currentColor') {
  const shapes = paths[name].map((path) => `<path d="${path}"/>`).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes}</svg>`
}

export default function CampusIcon({ name, ...props }: SVGProps<SVGSVGElement> & { name: CampusIconName }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {paths[name].map((path) => <path key={path} d={path} />)}
    </svg>
  )
}
