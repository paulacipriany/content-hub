// Datas comemorativas brasileiras mais relevantes para marketing/social media
// Fonte: datascomemorativas.me
// Formato: MM-DD → lista de nomes (recorrentes anualmente)

export interface CommemorativeDate {
  date: string; // MM-DD
  title: string;
}

export const COMMEMORATIVE_DATES: CommemorativeDate[] = [
  // Janeiro
  { date: '01-01', title: 'Confraternização Universal' },
  { date: '01-01', title: 'Dia Mundial da Paz' },
  { date: '01-04', title: 'Dia Mundial do Braille' },
  { date: '01-06', title: 'Dia de Reis' },
  { date: '01-08', title: 'Dia do Fotógrafo' },
  { date: '01-15', title: 'Dia de Martin Luther King Jr.' },
  { date: '01-20', title: 'Dia do Farmacêutico' },
  { date: '01-24', title: 'Dia Internacional da Educação' },
  { date: '01-25', title: 'Dia do Carteiro' },
  { date: '01-27', title: 'Dia Internacional em Memória das Vítimas do Holocausto' },
  { date: '01-30', title: 'Dia da Saudade' },
  { date: '01-31', title: 'Dia do Mágico' },

  // Fevereiro
  { date: '02-01', title: 'Dia do Publicitário' },
  { date: '02-02', title: 'Dia de Iemanjá' },
  { date: '02-04', title: 'Dia Mundial contra o Câncer' },
  { date: '02-10', title: 'Dia da Criação da Casa da Moeda do Brasil' },
  { date: '02-11', title: 'Dia Mundial do Enfermo' },
  { date: '02-14', title: 'Dia de São Valentim (Valentine\'s Day)' },
  { date: '02-21', title: 'Dia Internacional da Língua Materna' },
  { date: '02-22', title: 'Dia da Amizade e Dia do Ato de Bondade' },
  { date: '02-27', title: 'Dia Nacional do Livro Didático' },

  // Março
  { date: '03-01', title: 'Dia da Discriminação Zero' },
  { date: '03-08', title: 'Dia Internacional da Mulher' },
  { date: '03-10', title: 'Dia do Telefone' },
  { date: '03-12', title: 'Dia do Bibliotecário' },
  { date: '03-14', title: 'Dia Nacional da Poesia' },
  { date: '03-14', title: 'Dia dos Animais' },
  { date: '03-15', title: 'Dia Mundial do Consumidor' },
  { date: '03-15', title: 'Dia da Escola' },
  { date: '03-19', title: 'Dia de São José' },
  { date: '03-20', title: 'Dia Internacional da Felicidade' },
  { date: '03-20', title: 'Início do Outono' },
  { date: '03-21', title: 'Dia Mundial da Poesia' },
  { date: '03-21', title: 'Dia Internacional Contra a Discriminação Racial' },
  { date: '03-21', title: 'Dia Internacional da Síndrome de Down' },
  { date: '03-22', title: 'Dia Mundial da Água' },
  { date: '03-26', title: 'Dia do Cacau' },
  { date: '03-27', title: 'Dia do Circo' },
  { date: '03-31', title: 'Dia da Saúde e Nutrição' },

  // Abril
  { date: '04-01', title: 'Dia da Mentira' },
  { date: '04-02', title: 'Dia Internacional do Livro Infantil' },
  { date: '04-02', title: 'Dia Mundial de Conscientização do Autismo' },
  { date: '04-07', title: 'Dia Mundial da Saúde' },
  { date: '04-08', title: 'Dia Internacional do Combate ao Câncer' },
  { date: '04-10', title: 'Dia da Engenharia' },
  { date: '04-13', title: 'Dia do Hino Nacional' },
  { date: '04-14', title: 'Dia Pan-Americano' },
  { date: '04-15', title: 'Dia Mundial do Desenhista' },
  { date: '04-18', title: 'Dia Nacional do Livro Infantil' },
  { date: '04-19', title: 'Dia do Índio' },
  { date: '04-21', title: 'Tiradentes' },
  { date: '04-22', title: 'Dia do Descobrimento do Brasil' },
  { date: '04-22', title: 'Dia da Terra' },
  { date: '04-23', title: 'Dia Mundial do Livro' },
  { date: '04-25', title: 'Dia do Contabilista' },
  { date: '04-28', title: 'Dia da Educação' },

  // Maio
  { date: '05-01', title: 'Dia Mundial do Trabalho' },
  { date: '05-01', title: 'Dia da Literatura Brasileira' },
  { date: '05-03', title: 'Dia da Liberdade de Imprensa' },
  { date: '05-05', title: 'Dia da Língua Portuguesa' },
  { date: '05-08', title: 'Dia das Mães (2º domingo)' },
  { date: '05-10', title: 'Dia das Mães' },
  { date: '05-13', title: 'Dia da Abolição da Escravatura' },
  { date: '05-15', title: 'Dia do Assistente Social' },
  { date: '05-17', title: 'Dia Internacional contra a Homofobia' },
  { date: '05-18', title: 'Dia Nacional de Combate ao Abuso Sexual de Crianças' },
  { date: '05-25', title: 'Dia da Indústria' },
  { date: '05-25', title: 'Dia do Trabalhador Rural' },
  { date: '05-28', title: 'Dia do Hambúrguer' },
  { date: '05-29', title: 'Dia do Geógrafo' },

  // Junho
  { date: '06-01', title: 'Dia da Imprensa' },
  { date: '06-03', title: 'Dia Mundial da Bicicleta' },
  { date: '06-05', title: 'Dia Mundial do Meio Ambiente' },
  { date: '06-05', title: 'Dia da Ecologia' },
  { date: '06-10', title: 'Dia da Raça e Dia da Língua Portuguesa' },
  { date: '06-12', title: 'Dia dos Namorados' },
  { date: '06-13', title: 'Dia de Santo Antônio' },
  { date: '06-14', title: 'Dia Mundial do Doador de Sangue' },
  { date: '06-20', title: 'Dia do Revendedor' },
  { date: '06-21', title: 'Início do Inverno' },
  { date: '06-21', title: 'Dia Internacional do Yoga' },
  { date: '06-24', title: 'Dia de São João' },
  { date: '06-28', title: 'Dia do Orgulho LGBTQIA+' },
  { date: '06-29', title: 'Dia de São Pedro e São Paulo' },

  // Julho
  { date: '07-01', title: 'Dia Internacional do Cooperativismo' },
  { date: '07-02', title: 'Dia do Bombeiro Brasileiro' },
  { date: '07-07', title: 'Dia Mundial do Chocolate' },
  { date: '07-10', title: 'Dia da Pizza' },
  { date: '07-11', title: 'Dia Mundial da População' },
  { date: '07-13', title: 'Dia do Cantor e Dia do Rock' },
  { date: '07-15', title: 'Dia do Homem' },
  { date: '07-17', title: 'Dia do Protetor de Florestas' },
  { date: '07-20', title: 'Dia do Amigo e Internacional da Amizade' },
  { date: '07-22', title: 'Dia do Trabalho Doméstico' },
  { date: '07-25', title: 'Dia do Escritor' },
  { date: '07-26', title: 'Dia dos Avós' },
  { date: '07-28', title: 'Dia do Agricultor' },

  // Agosto
  { date: '08-01', title: 'Dia Nacional do Selo' },
  { date: '08-05', title: 'Dia Nacional da Saúde' },
  { date: '08-09', title: 'Dia dos Pais (2º domingo)' },
  { date: '08-10', title: 'Dia dos Pais' },
  { date: '08-11', title: 'Dia do Estudante' },
  { date: '08-12', title: 'Dia Internacional da Juventude' },
  { date: '08-13', title: 'Dia dos Canhotos' },
  { date: '08-15', title: 'Dia da Informática' },
  { date: '08-19', title: 'Dia Mundial da Fotografia' },
  { date: '08-22', title: 'Dia do Folclore' },
  { date: '08-24', title: 'Dia da Infância' },
  { date: '08-25', title: 'Dia do Soldado' },
  { date: '08-29', title: 'Dia Nacional de Combate ao Fumo' },

  // Setembro
  { date: '09-01', title: 'Dia do Profissional de Educação Física' },
  { date: '09-03', title: 'Dia do Biólogo' },
  { date: '09-05', title: 'Dia da Amazônia' },
  { date: '09-07', title: 'Independência do Brasil' },
  { date: '09-10', title: 'Dia Mundial de Prevenção ao Suicídio' },
  { date: '09-15', title: 'Dia do Cliente' },
  { date: '09-17', title: 'Dia da Compreensão Mundial' },
  { date: '09-19', title: 'Dia do Teatro' },
  { date: '09-21', title: 'Dia da Árvore' },
  { date: '09-21', title: 'Dia Internacional da Paz' },
  { date: '09-22', title: 'Início da Primavera' },
  { date: '09-23', title: 'Dia Internacional contra a Exploração Sexual' },
  { date: '09-26', title: 'Dia Nacional do Surdo' },
  { date: '09-27', title: 'Dia Nacional do Idoso' },
  { date: '09-28', title: 'Dia Mundial do Coração' },

  // Outubro
  { date: '10-01', title: 'Dia Nacional do Idoso' },
  { date: '10-01', title: 'Dia do Vendedor' },
  { date: '10-03', title: 'Dia Mundial do Dentista' },
  { date: '10-04', title: 'Dia dos Animais' },
  { date: '10-05', title: 'Dia Mundial do Professor' },
  { date: '10-10', title: 'Dia Mundial da Saúde Mental' },
  { date: '10-12', title: 'Dia das Crianças' },
  { date: '10-12', title: 'Nossa Senhora Aparecida' },
  { date: '10-15', title: 'Dia do Professor' },
  { date: '10-16', title: 'Dia Mundial da Alimentação' },
  { date: '10-18', title: 'Dia do Médico' },
  { date: '10-20', title: 'Dia do Poeta' },
  { date: '10-23', title: 'Dia da Aviação' },
  { date: '10-25', title: 'Dia da Democracia' },
  { date: '10-28', title: 'Dia do Servidor Público' },
  { date: '10-29', title: 'Dia Nacional do Livro' },
  { date: '10-31', title: 'Halloween / Dia das Bruxas' },

  // Novembro
  { date: '11-01', title: 'Dia de Todos os Santos' },
  { date: '11-02', title: 'Dia de Finados' },
  { date: '11-05', title: 'Dia Nacional do Designer' },
  { date: '11-05', title: 'Dia da Ciência e Cultura' },
  { date: '11-10', title: 'Dia do Trigo' },
  { date: '11-12', title: 'Dia do Diretor de Escola' },
  { date: '11-14', title: 'Dia Mundial do Diabetes' },
  { date: '11-15', title: 'Proclamação da República' },
  { date: '11-17', title: 'Dia Internacional dos Estudantes' },
  { date: '11-19', title: 'Dia da Bandeira' },
  { date: '11-20', title: 'Dia da Consciência Negra' },
  { date: '11-21', title: 'Dia Mundial da Televisão' },
  { date: '11-25', title: 'Dia Internacional da Não Violência contra a Mulher' },
  { date: '11-29', title: 'Black Friday (última sexta)' },

  // Dezembro
  { date: '12-01', title: 'Dia Internacional da Luta contra a AIDS' },
  { date: '12-02', title: 'Dia Nacional do Samba' },
  { date: '12-03', title: 'Dia Internacional da Pessoa com Deficiência' },
  { date: '12-08', title: 'Dia da Família' },
  { date: '12-08', title: 'Dia da Imaculada Conceição' },
  { date: '12-10', title: 'Dia dos Direitos Humanos' },
  { date: '12-11', title: 'Dia do Engenheiro e do Arquiteto' },
  { date: '12-13', title: 'Dia do Ótico' },
  { date: '12-14', title: 'Dia Nacional do Ministério Público' },
  { date: '12-21', title: 'Início do Verão' },
  { date: '12-24', title: 'Véspera de Natal' },
  { date: '12-25', title: 'Natal' },
  { date: '12-28', title: 'Dia do Salva-vidas' },
  { date: '12-31', title: 'Réveillon' },
];

/**
 * Get commemorative dates for a specific date string (YYYY-MM-DD)
 */
export function getCommemorativeDatesForDay(dateStr: string): string[] {
  const mmdd = dateStr.slice(5); // Extract MM-DD
  return COMMEMORATIVE_DATES
    .filter(d => d.date === mmdd)
    .map(d => d.title);
}

/**
 * Get all commemorative dates for a month (0-indexed)
 */
export function getCommemorativeDatesForMonth(month: number): Map<string, string[]> {
  const mm = String(month + 1).padStart(2, '0');
  const result = new Map<string, string[]>();
  COMMEMORATIVE_DATES
    .filter(d => d.date.startsWith(mm))
    .forEach(d => {
      const day = d.date.slice(3);
      const key = `${mm}-${day}`;
      if (!result.has(key)) result.set(key, []);
      result.get(key)!.push(d.title);
    });
  return result;
}
