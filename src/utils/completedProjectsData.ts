export interface ProjectItem {
  id: number;
  title: string;
  address: string;
  district: string;
  lat: string;
  lng: string;
  isOffice?: boolean;
  status?: 'completed' | 'ongoing';
}

export const INITIAL_PROJECTS: ProjectItem[] = [
  { id: 1, title: "AB-YAPI Merkez Ofis", address: "Kocamustafapaşa Mah. İstanbul", district: "Fatih / İstanbul", lat: "41.004813", lng: "28.933724", isOffice: true },
  { id: 2, title: "Çınar Sokak No: 2", address: "Çınar Sk. No: 2, Cerrahpaşa Mah.", district: "Fatih / İstanbul", lat: "41.004768", lng: "28.933771" },
  { id: 3, title: "Çınar Sokak No: 14", address: "Çınar Sk. No: 14, Cerrahpaşa Mah.", district: "Fatih / İstanbul", lat: "41.005280", lng: "28.933787" },
  { id: 4, title: "Marmara Caddesi No: 64", address: "Marmara Cd. No: 64, Kocamustafapaşa Mah.", district: "Fatih / İstanbul", lat: "41.002360", lng: "28.932800" },
  { id: 5, title: "Demirci Osman Sokak No: 9", address: "Demirci Osman Sk. No: 9, Kocamustafapaşa Mah.", district: "Fatih / İstanbul", lat: "41.002884", lng: "28.932902" },
  { id: 6, title: "Demirci Osman Sokak No: 23", address: "Demirci Osman Sk. No: 23, Kocamustafapaşa Mah.", district: "Fatih / İstanbul", lat: "41.002637", lng: "28.932571" },
  { id: 7, title: "Demirci Osman Sokak No: 25", address: "Demirci Osman Sk. No: 25, Kocamustafapaşa Mah.", district: "Fatih / İstanbul", lat: "41.002561", lng: "28.932514" },
  { id: 8, title: "Demirci Osman Sokak No: 102", address: "Demirci Osman Sk. No: 102, Kocamustafapaşa Mah.", district: "Fatih / İstanbul", lat: "41.000811", lng: "28.929924" },
  { id: 9, title: "Cambaziye Sokak No: 38", address: "Cambaziye Sk. No: 38, Cerrahpaşa Mah.", district: "Fatih / İstanbul", lat: "41.002848", lng: "28.932514" },
  { id: 10, title: "Cambaziye Sokak No: 46", address: "Cambaziye Sk. No: 46, Cerrahpaşa Mah.", district: "Fatih / İstanbul", lat: "41.002655", lng: "28.932836" },
  { id: 11, title: "Tütüncüzade Sokak No: 5", address: "Tütüncüzade Sk. No: 5, Cerrahpaşa Mah.", district: "Fatih / İstanbul", lat: "41.005046", lng: "28.934234" },
  { id: 12, title: "Kürkçübaşı Çeşmesi Sokak No: 42", address: "Kürkçübaşı Çeşmesi Sk. No: 42, Aksaray Mah.", district: "Fatih / İstanbul", lat: "41.005889", lng: "28.943891" },
  { id: 13, title: "Ahmet Hikmet Sokak No: 44", address: "Ahmet Hikmet Sk. No: 44, Haseki Sultan Mah.", district: "Fatih / İstanbul", lat: "41.008826", lng: "28.940347" },
  { id: 14, title: "Mecitbey Sokak No: 23", address: "Mecitbey Sk. No: 23, Seyyid Ömer Mah.", district: "Fatih / İstanbul", lat: "41.009681", lng: "28.929486" },
  { id: 15, title: "Zikirci Sokak No: 18", address: "Zikirci Sk. No: 18, Seyyid Ömer Mah.", district: "Fatih / İstanbul", lat: "41.009722", lng: "28.928867" },
  { id: 16, title: "Hacıhamza Sokak No: 7", address: "Hacıhamza Sk. No: 7, Sümbül Efendi Mah.", district: "Fatih / İstanbul", lat: "41.002207", lng: "28.924524" },
  { id: 17, title: "Silivrikapı Caddesi No: 69", address: "Silivrikapı Cd. No: 69, Silivrikapı Mah.", district: "Fatih / İstanbul", lat: "41.006614", lng: "28.925632" },
  { id: 18, title: "Yağhane Sokak Projesi", address: "Yağhane Sk., Silivrikapı Mah.", district: "Fatih / İstanbul", lat: "41.007388", lng: "28.925359" },
  { id: 19, title: "Yediemirler Sokak Projesi", address: "Yediemirler Sk., Silivrikapı Mah.", district: "Fatih / İstanbul", lat: "41.007206", lng: "28.925713" },
  { id: 20, title: "Sebzeci Sokak No: 20", address: "Sebzeci Sk. No: 20, Cerrahpaşa Mah.", district: "Fatih / İstanbul", lat: "41.004882", lng: "28.930022" },
  { id: 21, title: "Sebzeci Sokak No: 21", address: "Sebzeci Sk. No: 21, Cerrahpaşa Mah.", district: "Fatih / İstanbul", lat: "41.005019", lng: "28.929852" },
  { id: 22, title: "Ali Fakih Sokak No: 56", address: "Ali Fakih Sk. No: 56, Sümbül Efendi Mah.", district: "Fatih / İstanbul", lat: "41.002099", lng: "28.926823" }
];

export function getCompletedProjectsText(): string {
  try {
    let list = INITIAL_PROJECTS;
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem('abyapi_completed_projects');
      if (saved) {
        const parsedSaved = JSON.parse(saved) as ProjectItem[];
        const customProjects = parsedSaved.filter(p => p.id > 22);
        list = [...INITIAL_PROJECTS, ...customProjects];
      }
    }
    // Filter out office and only keep completed ones (default status or explicit 'completed')
    const completedOnes = list.filter(p => !p.isOffice && (p.status || 'completed') === 'completed');
    
    // Return formatted string of up to 4-5 items or all of them
    // Let's take the first 4-5 projects for a neat list, or show them all. Let's take up to 5 so it fits nicely.
    // Wait, let's take up to 5 completed projects and format them exactly!
    return completedOnes.map((p, idx) => `${idx + 1}. ${p.title} (${p.district}) - ${p.address}`).join('\n');
  } catch (e) {
    // Fallback if anything goes wrong
    const fallbackOnes = INITIAL_PROJECTS.filter(p => !p.isOffice);
    return fallbackOnes.map((p, idx) => `${idx + 1}. ${p.title} (${p.district}) - ${p.address}`).join('\n');
  }
}
