"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Categoria = {
  id: number;
  name: string;
};

type Personalizavel = {
  id: number;
  category_id: number;
  name: string;
  is_customizable: boolean;
};

type Grupo = {
  id: number;
  sweet_id: number;
  name: string;
  min_choices: number;
  max_choices: number;
};

type Opcao = {
  id: number;
  part_id: number;
  name: string;
  extra_price: number;
};

type Criacao = {
  id: number;
  sweet_id: number;
  name: string;
  sale_price: number;
  created_at: string;
};

type Escolha = {
  id: number;
  creation_id: number;
  part_id: number;
  option_id: number;
};

function formatarPreco(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function numeroDoCampo(valor: string) {
  const texto = valor.trim();

  if (!texto) return 0;

  // Aceita "12", "12,50" e "12.50"
  const normalizado =
    texto.includes(",")
      ? texto.replace(/\./g, "").replace(",", ".")
      : texto;

  const numero = Number(normalizado);

  return Number.isFinite(numero) ? numero : NaN;
}

export default function PersonalizadoPage() {
  const params = useParams();

  const categoriaId = Number(params.id);
  const doceId = Number(params.doceId);

  const [categoria, setCategoria] = useState<Categoria | null>(null);
  const [produto, setProduto] = useState<Personalizavel | null>(null);

  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [opcoes, setOpcoes] = useState<Opcao[]>([]);
  const [criacoes, setCriacoes] = useState<Criacao[]>([]);
  const [escolhas, setEscolhas] = useState<Escolha[]>([]);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  // Grupo
  const [mostrarGrupo, setMostrarGrupo] = useState(false);
  const [grupoEditando, setGrupoEditando] = useState<Grupo | null>(null);
  const [nomeGrupo, setNomeGrupo] = useState("");
  const [minEscolhas, setMinEscolhas] = useState("1");
  const [maxEscolhas, setMaxEscolhas] = useState("1");
  const [salvandoGrupo, setSalvandoGrupo] = useState(false);
  const [grupoExcluindo, setGrupoExcluindo] = useState<Grupo | null>(null);

  // Opção
  const [grupoParaOpcao, setGrupoParaOpcao] = useState<Grupo | null>(null);
  const [opcaoEditando, setOpcaoEditando] = useState<Opcao | null>(null);
  const [nomeOpcao, setNomeOpcao] = useState("");
  const [precoExtraOpcao, setPrecoExtraOpcao] = useState("");
  const [salvandoOpcao, setSalvandoOpcao] = useState(false);
  const [opcaoExcluindo, setOpcaoExcluindo] = useState<Opcao | null>(null);

  // Criar personalizado
  const [mostrarCriacao, setMostrarCriacao] = useState(false);
  const [nomeCriacao, setNomeCriacao] = useState("");
  const [precoCriacao, setPrecoCriacao] = useState("");
  const [selecoes, setSelecoes] = useState<Record<number, number[]>>({});
  const [salvandoCriacao, setSalvandoCriacao] = useState(false);
  const [criacaoEditando, setCriacaoEditando] = useState<Criacao | null>(null);
  const [criacaoExcluindo, setCriacaoExcluindo] = useState<Criacao | null>(null);

  // Receita: por enquanto só identifica qual opção foi clicada.
  // A tela de receita dessa opção será construída na próxima etapa.
  const [opcaoReceita, setOpcaoReceita] = useState<Opcao | null>(null);

  async function carregarPagina() {
    setCarregando(true);
    setErro("");

    const { data: categoriaData, error: categoriaError } = await supabase
      .from("sweet_categories")
      .select("id, name")
      .eq("id", categoriaId)
      .single();

    if (categoriaError || !categoriaData) {
      console.error(categoriaError);
      setErro("Não foi possível carregar a categoria.");
      setCarregando(false);
      return;
    }

    setCategoria({
      id: Number(categoriaData.id),
      name: String(categoriaData.name),
    });

    const { data: produtoData, error: produtoError } = await supabase
      .from("sweets")
      .select("id, category_id, name, is_customizable")
      .eq("id", doceId)
      .eq("category_id", categoriaId)
      .single();

    if (produtoError || !produtoData) {
      console.error(produtoError);
      setErro("Não foi possível carregar o produto personalizável.");
      setCarregando(false);
      return;
    }

    const produtoConvertido: Personalizavel = {
      id: Number(produtoData.id),
      category_id: Number(produtoData.category_id),
      name: String(produtoData.name),
      is_customizable: Boolean(produtoData.is_customizable),
    };

    setProduto(produtoConvertido);

    if (!produtoConvertido.is_customizable) {
      setErro("Este item não está marcado como personalizável.");
      setCarregando(false);
      return;
    }

    const { data: gruposData, error: gruposError } = await supabase
      .from("sweet_parts")
      .select("id, sweet_id, name, min_choices, max_choices")
      .eq("sweet_id", doceId)
      .order("id", { ascending: true });

    if (gruposError) {
      console.error(gruposError);
      setErro("Não foi possível carregar os grupos.");
      setCarregando(false);
      return;
    }

    const gruposConvertidos: Grupo[] = (gruposData ?? []).map((item) => ({
      id: Number(item.id),
      sweet_id: Number(item.sweet_id),
      name: String(item.name),
      min_choices: Number(item.min_choices ?? 0),
      max_choices: Number(item.max_choices ?? 1),
    }));

    setGrupos(gruposConvertidos);

    const idsGrupos = gruposConvertidos.map((grupo) => grupo.id);

    if (idsGrupos.length > 0) {
      const { data: opcoesData, error: opcoesError } = await supabase
        .from("sweet_part_options")
        .select("id, part_id, name, extra_price")
        .in("part_id", idsGrupos)
        .order("id", { ascending: true });

      if (opcoesError) {
        console.error(opcoesError);
        setErro("Não foi possível carregar as opções.");
      } else {
        setOpcoes(
          (opcoesData ?? []).map((item) => ({
            id: Number(item.id),
            part_id: Number(item.part_id),
            name: String(item.name),
            extra_price: Number(item.extra_price ?? 0),
          }))
        );
      }
    } else {
      setOpcoes([]);
    }

    const { data: criacoesData, error: criacoesError } = await supabase
      .from("sweet_custom_creations")
      .select("id, sweet_id, name, sale_price, created_at")
      .eq("sweet_id", doceId)
      .order("created_at", { ascending: false });

    if (criacoesError) {
      console.error(criacoesError);
      setErro("Não foi possível carregar as criações.");
    } else {
      const criacoesConvertidas: Criacao[] = (criacoesData ?? []).map(
        (item) => ({
          id: Number(item.id),
          sweet_id: Number(item.sweet_id),
          name: String(item.name),
          sale_price: Number(item.sale_price ?? 0),
          created_at: String(item.created_at),
        })
      );

      setCriacoes(criacoesConvertidas);

      const idsCriacoes = criacoesConvertidas.map((criacao) => criacao.id);

      if (idsCriacoes.length > 0) {
        const { data: escolhasData, error: escolhasError } = await supabase
          .from("sweet_custom_creation_choices")
          .select("id, creation_id, part_id, option_id")
          .in("creation_id", idsCriacoes)
          .order("id", { ascending: true });

        if (escolhasError) {
          console.error(escolhasError);
          setErro("Não foi possível carregar as escolhas das criações.");
        } else {
          setEscolhas(
            (escolhasData ?? []).map((item) => ({
              id: Number(item.id),
              creation_id: Number(item.creation_id),
              part_id: Number(item.part_id),
              option_id: Number(item.option_id),
            }))
          );
        }
      } else {
        setEscolhas([]);
      }
    }

    setCarregando(false);
  }

  useEffect(() => {
    if (categoriaId && doceId) carregarPagina();
  }, [categoriaId, doceId]);

  const opcoesPorGrupo = useMemo(() => {
    const mapa: Record<number, Opcao[]> = {};

    grupos.forEach((grupo) => {
      mapa[grupo.id] = opcoes.filter((opcao) => opcao.part_id === grupo.id);
    });

    return mapa;
  }, [grupos, opcoes]);

  const totalExtrasSelecionados = useMemo(() => {
    return Object.values(selecoes)
      .flat()
      .reduce((total, opcaoId) => {
        const opcao = opcoes.find((item) => item.id === opcaoId);
        return total + Number(opcao?.extra_price ?? 0);
      }, 0);
  }, [selecoes, opcoes]);

  function abrirNovoGrupo() {
    setErro("");
    setSucesso("");
    setGrupoEditando(null);
    setNomeGrupo("");
    setMinEscolhas("1");
    setMaxEscolhas("1");
    setMostrarGrupo(true);
  }

  function abrirEditarGrupo(grupo: Grupo) {
    setErro("");
    setSucesso("");
    setGrupoEditando(grupo);
    setNomeGrupo(grupo.name);
    setMinEscolhas(String(grupo.min_choices));
    setMaxEscolhas(String(grupo.max_choices));
    setMostrarGrupo(true);
  }

  function fecharGrupo() {
    if (salvandoGrupo) return;
    setMostrarGrupo(false);
    setGrupoEditando(null);
    setErro("");
  }

  async function salvarGrupo() {
    if (!nomeGrupo.trim()) {
      setErro("Digite o nome do grupo.");
      return;
    }

    const min = Number(minEscolhas);
    const max = Number(maxEscolhas);

    if (
      !Number.isInteger(min) ||
      !Number.isInteger(max) ||
      min < 0 ||
      max < 1 ||
      min > max
    ) {
      setErro(
        "Use um mínimo e máximo válidos. O mínimo não pode ser maior que o máximo."
      );
      return;
    }

    setSalvandoGrupo(true);
    setErro("");

    if (grupoEditando) {
      const { error } = await supabase
        .from("sweet_parts")
        .update({
          name: nomeGrupo.trim(),
          min_choices: min,
          max_choices: max,
        })
        .eq("id", grupoEditando.id);

      if (error) {
        console.error(error);
        setErro("Não foi possível editar o grupo.");
        setSalvandoGrupo(false);
        return;
      }

      setSucesso("Grupo atualizado.");
    } else {
      const { error } = await supabase.from("sweet_parts").insert({
        sweet_id: doceId,
        name: nomeGrupo.trim(),
        min_choices: min,
        max_choices: max,
      });

      if (error) {
        console.error(error);
        setErro("Não foi possível criar o grupo.");
        setSalvandoGrupo(false);
        return;
      }

      setSucesso("Grupo criado.");
    }

    setSalvandoGrupo(false);
    setMostrarGrupo(false);
    setGrupoEditando(null);
    await carregarPagina();
  }

  async function excluirGrupo() {
    if (!grupoExcluindo) return;

    setErro("");

    const { error } = await supabase
      .from("sweet_parts")
      .delete()
      .eq("id", grupoExcluindo.id);

    if (error) {
      console.error(error);
      setErro(
        "Este grupo já está sendo usado em alguma criação. Exclua primeiro a criação vinculada."
      );
      setGrupoExcluindo(null);
      return;
    }

    setGrupoExcluindo(null);
    setSucesso("Grupo excluído.");
    await carregarPagina();
  }

  function abrirNovaOpcao(grupo: Grupo) {
    setErro("");
    setSucesso("");
    setGrupoParaOpcao(grupo);
    setOpcaoEditando(null);
    setNomeOpcao("");
    setPrecoExtraOpcao("0,00");
  }

  function abrirEditarOpcao(grupo: Grupo, opcao: Opcao) {
    setErro("");
    setSucesso("");
    setGrupoParaOpcao(grupo);
    setOpcaoEditando(opcao);
    setNomeOpcao(opcao.name);
    setPrecoExtraOpcao(
      Number(opcao.extra_price).toFixed(2).replace(".", ",")
    );
  }

  function fecharOpcao() {
    if (salvandoOpcao) return;
    setGrupoParaOpcao(null);
    setOpcaoEditando(null);
    setNomeOpcao("");
    setPrecoExtraOpcao("");
    setErro("");
  }

  async function salvarOpcao() {
    if (!grupoParaOpcao) return;

    if (!nomeOpcao.trim()) {
      setErro("Digite o nome da opção.");
      return;
    }

    const extra = numeroDoCampo(precoExtraOpcao);

    if (Number.isNaN(extra) || extra < 0) {
      setErro("Informe um acréscimo válido.");
      return;
    }

    setSalvandoOpcao(true);
    setErro("");

    if (opcaoEditando) {
      const { error } = await supabase
        .from("sweet_part_options")
        .update({
          name: nomeOpcao.trim(),
          extra_price: extra,
        })
        .eq("id", opcaoEditando.id);

      if (error) {
        console.error(error);
        setErro("Não foi possível editar a opção.");
        setSalvandoOpcao(false);
        return;
      }

      setSucesso("Opção atualizada.");
    } else {
      const { error } = await supabase.from("sweet_part_options").insert({
        part_id: grupoParaOpcao.id,
        name: nomeOpcao.trim(),
        extra_price: extra,
      });

      if (error) {
        console.error(error);
        setErro("Não foi possível criar a opção.");
        setSalvandoOpcao(false);
        return;
      }

      setSucesso("Opção criada.");
    }

    setSalvandoOpcao(false);
    setGrupoParaOpcao(null);
    setOpcaoEditando(null);
    setNomeOpcao("");
    setPrecoExtraOpcao("");
    await carregarPagina();
  }

  async function excluirOpcao() {
    if (!opcaoExcluindo) return;

    setErro("");

    const { error } = await supabase
      .from("sweet_part_options")
      .delete()
      .eq("id", opcaoExcluindo.id);

    if (error) {
      console.error(error);
      setErro(
        "Esta opção já está sendo usada em alguma criação. Exclua primeiro a criação vinculada."
      );
      setOpcaoExcluindo(null);
      return;
    }

    setOpcaoExcluindo(null);
    setSucesso("Opção excluída.");
    await carregarPagina();
  }

  function abrirCriacao() {
    setErro("");
    setSucesso("");
    setCriacaoEditando(null);
    setNomeCriacao("");
    setPrecoCriacao("");
    setSelecoes({});
    setMostrarCriacao(true);
  }

  function abrirEditarCriacao(criacao: Criacao) {
    setErro("");
    setSucesso("");
    setCriacaoEditando(criacao);
    setNomeCriacao(criacao.name);
    setPrecoCriacao(
      Number(criacao.sale_price)
        .toFixed(2)
        .replace(".", ",")
    );

    const selecoesAtuais: Record<number, number[]> = {};

    grupos.forEach((grupo) => {
      selecoesAtuais[grupo.id] = escolhas
        .filter(
          (escolha) =>
            escolha.creation_id === criacao.id &&
            escolha.part_id === grupo.id
        )
        .map((escolha) => escolha.option_id);
    });

    setSelecoes(selecoesAtuais);
    setMostrarCriacao(true);
  }

  function fecharCriacao() {
    if (salvandoCriacao) return;
    setMostrarCriacao(false);
    setCriacaoEditando(null);
    setNomeCriacao("");
    setPrecoCriacao("");
    setSelecoes({});
    setErro("");
  }

  function alternarOpcao(grupo: Grupo, opcaoId: number) {
    const atuais = selecoes[grupo.id] ?? [];
    const selecionada = atuais.includes(opcaoId);

    if (selecionada) {
      setSelecoes({
        ...selecoes,
        [grupo.id]: atuais.filter((id) => id !== opcaoId),
      });
      return;
    }

    if (grupo.max_choices === 1) {
      setSelecoes({
        ...selecoes,
        [grupo.id]: [opcaoId],
      });
      return;
    }

    if (atuais.length >= grupo.max_choices) return;

    setSelecoes({
      ...selecoes,
      [grupo.id]: [...atuais, opcaoId],
    });
  }

  async function salvarCriacao() {
    if (!produto) return;

    if (!nomeCriacao.trim()) {
      setErro("Digite um nome para esta criação. Ex.: Bolo da Kátia.");
      return;
    }

    const precoFinal = numeroDoCampo(precoCriacao);

    if (Number.isNaN(precoFinal) || precoFinal < 0) {
      setErro("Informe um preço válido para esta criação.");
      return;
    }

    for (const grupo of grupos) {
      const quantidade = (selecoes[grupo.id] ?? []).length;

      if (
        quantidade < grupo.min_choices ||
        quantidade > grupo.max_choices
      ) {
        if (grupo.min_choices === grupo.max_choices) {
          setErro(`${grupo.name}: escolha exatamente ${grupo.min_choices}.`);
        } else {
          setErro(
            `${grupo.name}: escolha entre ${grupo.min_choices} e ${grupo.max_choices}.`
          );
        }
        return;
      }
    }

    setSalvandoCriacao(true);
    setErro("");

    const itens = grupos.flatMap((grupo) =>
      (selecoes[grupo.id] ?? []).map((optionId) => ({
        part_id: grupo.id,
        option_id: optionId,
      }))
    );

    // =========================================================
    // EDIÇÃO DE UMA CRIAÇÃO EXISTENTE
    // =========================================================
    if (criacaoEditando) {
      const escolhasAntigas = escolhas
        .filter(
          (escolha) =>
            escolha.creation_id === criacaoEditando.id
        )
        .map((escolha) => ({
          creation_id: criacaoEditando.id,
          part_id: escolha.part_id,
          option_id: escolha.option_id,
        }));

      const { error: updateError } = await supabase
        .from("sweet_custom_creations")
        .update({
          name: nomeCriacao.trim(),
          sale_price: precoFinal,
        })
        .eq("id", criacaoEditando.id);

      if (updateError) {
        console.error(updateError);
        setErro("Não foi possível editar a criação.");
        setSalvandoCriacao(false);
        return;
      }

      const { error: deleteChoicesError } = await supabase
        .from("sweet_custom_creation_choices")
        .delete()
        .eq("creation_id", criacaoEditando.id);

      if (deleteChoicesError) {
        console.error(deleteChoicesError);
        setErro("Não foi possível atualizar as escolhas da criação.");
        setSalvandoCriacao(false);
        return;
      }

      if (itens.length > 0) {
        const novasEscolhas = itens.map((item) => ({
          creation_id: criacaoEditando.id,
          part_id: item.part_id,
          option_id: item.option_id,
        }));

        const { error: insertChoicesError } = await supabase
          .from("sweet_custom_creation_choices")
          .insert(novasEscolhas);

        if (insertChoicesError) {
          console.error(insertChoicesError);

          // Tenta restaurar as escolhas anteriores para não deixar
          // a criação vazia caso ocorra algum erro inesperado.
          if (escolhasAntigas.length > 0) {
            await supabase
              .from("sweet_custom_creation_choices")
              .insert(escolhasAntigas);
          }

          setErro(
            "Não foi possível salvar as novas escolhas. As escolhas anteriores foram restauradas."
          );
          setSalvandoCriacao(false);
          return;
        }
      }

      setSalvandoCriacao(false);
      setMostrarCriacao(false);
      setCriacaoEditando(null);
      setNomeCriacao("");
      setPrecoCriacao("");
      setSelecoes({});
      setSucesso("Criação atualizada com sucesso.");

      await carregarPagina();
      return;
    }

    // =========================================================
    // NOVA CRIAÇÃO
    // =========================================================
    const { data: criacaoData, error: criacaoError } = await supabase
      .from("sweet_custom_creations")
      .insert({
        sweet_id: doceId,
        name: nomeCriacao.trim(),
        sale_price: precoFinal,
        base_price: 0,
      })
      .select("id")
      .single();

    if (criacaoError || !criacaoData) {
      console.error(criacaoError);
      setErro("Não foi possível criar o personalizado.");
      setSalvandoCriacao(false);
      return;
    }

    const creationId = Number(criacaoData.id);

    if (itens.length > 0) {
      const novasEscolhas = itens.map((item) => ({
        creation_id: creationId,
        part_id: item.part_id,
        option_id: item.option_id,
      }));

      const { error: escolhasError } = await supabase
        .from("sweet_custom_creation_choices")
        .insert(novasEscolhas);

      if (escolhasError) {
        console.error(escolhasError);

        await supabase
          .from("sweet_custom_creations")
          .delete()
          .eq("id", creationId);

        setErro("Não foi possível salvar as escolhas do personalizado.");
        setSalvandoCriacao(false);
        return;
      }
    }

    setSalvandoCriacao(false);
    setMostrarCriacao(false);
    setCriacaoEditando(null);
    setNomeCriacao("");
    setPrecoCriacao("");
    setSelecoes({});
    setSucesso("Personalizado criado com sucesso.");

    await carregarPagina();
  }

  async function excluirCriacao() {
    if (!criacaoExcluindo) return;

    setErro("");

    const { error } = await supabase
      .from("sweet_custom_creations")
      .delete()
      .eq("id", criacaoExcluindo.id);

    if (error) {
      console.error(error);
      setErro("Não foi possível excluir a criação.");
      setCriacaoExcluindo(null);
      return;
    }

    setCriacaoExcluindo(null);
    setSucesso("Criação excluída.");
    await carregarPagina();
  }

  function textoRegra(grupo: Grupo) {
    if (grupo.min_choices === grupo.max_choices) {
      if (grupo.min_choices === 1) return "Escolha 1";
      return `Escolha ${grupo.min_choices}`;
    }

    return `Escolha de ${grupo.min_choices} a ${grupo.max_choices}`;
  }

  function escolhasDaCriacao(criacaoId: number) {
    return escolhas
      .filter((escolha) => escolha.creation_id === criacaoId)
      .map((escolha) => {
        const grupo = grupos.find((item) => item.id === escolha.part_id);
        const opcao = opcoes.find((item) => item.id === escolha.option_id);

        if (!grupo || !opcao) return null;

        return {
          grupo: grupo.name,
          opcao: opcao.name,
          extra_price: opcao.extra_price,
        };
      })
      .filter(Boolean) as Array<{
      grupo: string;
      opcao: string;
      extra_price: number;
    }>;
  }

  if (carregando) {
    return (
      <main className="compras-page">
        <div className="page-shell">
          <div className="empty-purchases">
            <strong>Carregando...</strong>
          </div>
        </div>
      </main>
    );
  }

  if (!categoria || !produto) {
    return (
      <main className="compras-page">
        <div className="page-shell">
          <Link
            href={`/doces/categoria/${categoriaId}`}
            className="back-button"
          >
            ←
          </Link>

          <div className="empty-purchases">
            <strong>Personalizável não encontrado</strong>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="compras-page">
      <div className="page-shell">
        <header className="page-header">
          <Link
            href={`/doces/categoria/${categoriaId}`}
            className="back-button"
          >
            ←
          </Link>

          <div>
            <span className="page-kicker">PERSONALIZÁVEL</span>
            <h1>{produto.name}</h1>
            <p>
              Cadastre as partes, sabores e acréscimos. Depois monte uma criação.
            </p>
          </div>
        </header>

        {sucesso && (
          <div className="sweet-production-success">
            <strong>✓ {sucesso}</strong>
          </div>
        )}

        {erro &&
          !mostrarGrupo &&
          !grupoParaOpcao &&
          !mostrarCriacao &&
          !grupoExcluindo &&
          !opcaoExcluindo &&
          !criacaoExcluindo &&
          !opcaoReceita && <div className="form-error">{erro}</div>}

        <section className="custom-builder-section">
          <div className="custom-builder-section-header">
            <div>
              <span className="section-kicker">CONFIGURAÇÃO</span>
              <h2>Grupos de montagem</h2>
              <p>
                Ex.: Massa, Recheio 1, Recheio 2, Cobertura e Extras.
              </p>
            </div>

            <button
              type="button"
              className="custom-builder-secondary-button"
              onClick={abrirNovoGrupo}
            >
              + Novo grupo
            </button>
          </div>

          {grupos.length === 0 ? (
            <div className="empty-purchases">
              <strong>Nenhum grupo cadastrado</strong>
              <p>Comece criando a primeira parte do personalizado.</p>
            </div>
          ) : (
            <div className="custom-builder-group-list">
              {grupos.map((grupo) => {
                const opcoesGrupo = opcoesPorGrupo[grupo.id] ?? [];

                return (
                  <article key={grupo.id} className="custom-builder-group-card">
                    <div className="custom-builder-group-header">
                      <div>
                        <span>{textoRegra(grupo)}</span>
                        <h3>{grupo.name}</h3>
                      </div>

                      <div className="custom-builder-inline-actions">
                        <button
                          type="button"
                          onClick={() => abrirEditarGrupo(grupo)}
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          className="danger"
                          onClick={() => {
                            setErro("");
                            setGrupoExcluindo(grupo);
                          }}
                        >
                          Excluir
                        </button>
                      </div>
                    </div>

                    <div className="custom-builder-options">
                      {opcoesGrupo.length === 0 ? (
                        <div className="custom-builder-no-options">
                          Nenhuma opção cadastrada.
                        </div>
                      ) : (
                        opcoesGrupo.map((opcao) => (
                          <div
                            key={opcao.id}
                            className="custom-builder-option-row custom-builder-option-row-rich"
                          >
                            <div className="custom-builder-option-info">
                              <strong>{opcao.name}</strong>

                              {opcao.extra_price > 0 ? (
                                <span>
                                  + {formatarPreco(opcao.extra_price)}
                                </span>
                              ) : (
                                <span className="no-extra">
                                  sem acréscimo
                                </span>
                              )}
                            </div>

                            <div className="custom-builder-option-actions">
                              <button
                                type="button"
                                onClick={() => abrirEditarOpcao(grupo, opcao)}
                              >
                                Editar
                              </button>

                              <Link
  href={`/doces/categoria/${categoriaId}/personalizado/${doceId}/opcao/${opcao.id}/receita`}
  className="recipe"
>
  Receita
</Link>

                              <button
                                type="button"
                                className="danger"
                                onClick={() => {
                                  setErro("");
                                  setOpcaoExcluindo(opcao);
                                }}
                              >
                                Excluir
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <button
                      type="button"
                      className="custom-builder-add-option"
                      onClick={() => abrirNovaOpcao(grupo)}
                    >
                      + Adicionar opção
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="custom-builder-create-section">
          <div>
            <span className="section-kicker">MONTAGEM</span>
            <h2>Criar personalizado</h2>
            <p>
              Escolha as opções cadastradas e defina o preço final desta criação.
            </p>
          </div>

          <button
            type="button"
            className="custom-builder-create-button"
            onClick={abrirCriacao}
            disabled={grupos.length === 0}
          >
            + Criar personalizado
          </button>
        </section>

        <section className="custom-builder-creations-section">
          <div className="custom-builder-section-header">
            <div>
              <span className="section-kicker">CRIAÇÕES</span>
              <h2>Personalizados criados</h2>
            </div>
          </div>

          {criacoes.length === 0 ? (
            <div className="empty-purchases">
              <strong>Nenhuma criação ainda</strong>
              <p>Quando você montar uma, ela aparecerá aqui.</p>
            </div>
          ) : (
            <div className="custom-builder-creations-list">
              {criacoes.map((criacao) => {
                const itens = escolhasDaCriacao(criacao.id);

                return (
                  <article
                    key={criacao.id}
                    className="custom-builder-creation-card"
                  >
                    <div className="custom-builder-creation-header">
                      <div>
                        <strong>{criacao.name}</strong>
                        <span>{formatarPreco(criacao.sale_price)}</span>
                      </div>

                      <div className="custom-builder-creation-actions">
                        <button
                          type="button"
                          className="custom-builder-edit-creation"
                          onClick={() => abrirEditarCriacao(criacao)}
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          className="custom-builder-delete-creation"
                          onClick={() => setCriacaoExcluindo(criacao)}
                        >
                          Excluir
                        </button>
                      </div>
                    </div>

                    <div className="custom-builder-creation-choices">
                      {itens.map((item, index) => (
                        <div key={`${item.grupo}-${item.opcao}-${index}`}>
                          <span>{item.grupo}</span>
                          <strong>{item.opcao}</strong>
                          {item.extra_price > 0 && (
                            <small>
                              + {formatarPreco(item.extra_price)}
                            </small>
                          )}
                        </div>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* NOVO / EDITAR GRUPO */}
        {mostrarGrupo && (
          <div className="sweet-modal-overlay" onClick={fecharGrupo}>
            <div
              className="sweet-modal-box custom-builder-modal"
              onClick={(evento) => evento.stopPropagation()}
            >
              <button
                type="button"
                className="sweet-modal-close"
                onClick={fecharGrupo}
              >
                ×
              </button>

              <span className="page-kicker">
                {grupoEditando ? "EDITAR GRUPO" : "NOVO GRUPO"}
              </span>

              <h2>{grupoEditando ? grupoEditando.name : "Grupo de montagem"}</h2>

              <div className="form-group">
                <label>Nome do grupo</label>
                <input
                  type="text"
                  value={nomeGrupo}
                  onChange={(evento) => setNomeGrupo(evento.target.value)}
                  placeholder="Ex.: Massa"
                />
              </div>

              <div className="custom-builder-choice-grid">
                <div className="form-group">
                  <label>Mínimo de escolhas</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={minEscolhas}
                    onChange={(evento) => setMinEscolhas(evento.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Máximo de escolhas</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={maxEscolhas}
                    onChange={(evento) => setMaxEscolhas(evento.target.value)}
                  />
                </div>
              </div>

              <div className="custom-builder-help">
                <strong>Exemplo</strong>
                <span>
                  Massa: mínimo 1 e máximo 1. Recheios: mínimo 2 e máximo 2.
                </span>
              </div>

              {erro && <div className="form-error">{erro}</div>}

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={fecharGrupo}
                  disabled={salvandoGrupo}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="sweet-new-batch-button"
                  onClick={salvarGrupo}
                  disabled={salvandoGrupo}
                >
                  {salvandoGrupo
                    ? "Salvando..."
                    : grupoEditando
                      ? "Salvar alterações"
                      : "Criar grupo"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* NOVA / EDITAR OPÇÃO */}
        {grupoParaOpcao && (
          <div className="sweet-modal-overlay" onClick={fecharOpcao}>
            <div
              className="sweet-modal-box custom-builder-modal"
              onClick={(evento) => evento.stopPropagation()}
            >
              <button
                type="button"
                className="sweet-modal-close"
                onClick={fecharOpcao}
              >
                ×
              </button>

              <span className="page-kicker">
                {opcaoEditando ? "EDITAR OPÇÃO" : grupoParaOpcao.name}
              </span>

              <h2>{opcaoEditando ? opcaoEditando.name : "Nova opção"}</h2>

              <div className="form-group">
                <label>Nome da opção</label>
                <input
                  type="text"
                  value={nomeOpcao}
                  onChange={(evento) => setNomeOpcao(evento.target.value)}
                  placeholder="Ex.: Nutella"
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>Acréscimo desta opção</label>

                <div className="money-input-row">
                  <span>R$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={precoExtraOpcao}
                    onChange={(evento) =>
                      setPrecoExtraOpcao(evento.target.value)
                    }
                    placeholder="Ex.: 12,00"
                  />
                </div>

                <small>
                  Deixe R$ 0,00 quando esta opção não tiver custo adicional.
                </small>
              </div>

              {erro && <div className="form-error">{erro}</div>}

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={fecharOpcao}
                  disabled={salvandoOpcao}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="sweet-new-batch-button"
                  onClick={salvarOpcao}
                  disabled={salvandoOpcao}
                >
                  {salvandoOpcao
                    ? "Salvando..."
                    : opcaoEditando
                      ? "Salvar alterações"
                      : "Adicionar opção"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CRIAR PERSONALIZADO */}
        {mostrarCriacao && (
          <div className="sweet-modal-overlay" onClick={fecharCriacao}>
            <div
              className="sweet-modal-box custom-builder-create-modal"
              onClick={(evento) => evento.stopPropagation()}
            >
              <button
                type="button"
                className="sweet-modal-close"
                onClick={fecharCriacao}
              >
                ×
              </button>

              <span className="page-kicker">
                {criacaoEditando ? "EDITAR PERSONALIZADO" : "CRIAR PERSONALIZADO"}
              </span>
              <h2>
                {criacaoEditando ? "Editar criação" : "Monte sua criação"}
              </h2>

              <div className="form-group">
                <label>Nome desta criação</label>
                <input
                  type="text"
                  value={nomeCriacao}
                  onChange={(evento) => setNomeCriacao(evento.target.value)}
                  placeholder="Ex.: Bolo da Kátia"
                />
                <small>
                  Pode ser “Bolo da Kátia”, “Cone da Kátia”, “Pedido da Ana”...
                </small>
              </div>

              <div className="custom-builder-questionnaire">
                {grupos.map((grupo) => {
                  const opcoesGrupo = opcoesPorGrupo[grupo.id] ?? [];
                  const selecionadas = selecoes[grupo.id] ?? [];

                  return (
                    <section
                      key={grupo.id}
                      className="custom-builder-question"
                    >
                      <div>
                        <strong>{grupo.name}</strong>
                        <span>{textoRegra(grupo)}</span>
                      </div>

                      {opcoesGrupo.length === 0 ? (
                        <div className="custom-builder-no-options">
                          Este grupo ainda não possui opções.
                        </div>
                      ) : (
                        <div className="custom-builder-answer-list">
                          {opcoesGrupo.map((opcao) => {
                            const ativa = selecionadas.includes(opcao.id);

                            return (
                              <button
                                key={opcao.id}
                                type="button"
                                className={ativa ? "active" : ""}
                                onClick={() => alternarOpcao(grupo, opcao.id)}
                              >
                                <span className="custom-builder-check">
                                  {ativa ? "✓" : ""}
                                </span>

                                <span className="custom-builder-answer-name">
                                  {opcao.name}
                                </span>

                                {opcao.extra_price > 0 && (
                                  <strong className="custom-builder-answer-extra">
                                    + {formatarPreco(opcao.extra_price)}
                                  </strong>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>

              {totalExtrasSelecionados > 0 && (
                <div className="custom-builder-extra-reference">
                  <span>Acréscimos selecionados</span>
                  <strong>
                    + {formatarPreco(totalExtrasSelecionados)}
                  </strong>
                  <small>
                    Apenas referência. Você escolhe livremente o preço final abaixo.
                  </small>
                </div>
              )}

              <div className="form-group custom-builder-final-price">
                <label>Preço desta criação</label>

                <div className="money-input-row">
                  <span>R$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={precoCriacao}
                    onChange={(evento) => setPrecoCriacao(evento.target.value)}
                    placeholder="Ex.: 120,00"
                  />
                </div>

                <small>
                  Este é o valor final do produto. Você pode definir o preço que quiser.
                </small>
              </div>

              {erro && <div className="form-error">{erro}</div>}

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={fecharCriacao}
                  disabled={salvandoCriacao}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="custom-builder-create-button"
                  onClick={salvarCriacao}
                  disabled={salvandoCriacao}
                >
                  {salvandoCriacao
                    ? criacaoEditando
                      ? "Salvando..."
                      : "Criando..."
                    : criacaoEditando
                      ? "Salvar alterações"
                      : "Criar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* RECEITA DA OPÇÃO — PRÓXIMA ETAPA */}
        {opcaoReceita && (
          <div
            className="sweet-modal-overlay"
            onClick={() => setOpcaoReceita(null)}
          >
            <div
              className="sweet-modal-box custom-builder-modal"
              onClick={(evento) => evento.stopPropagation()}
            >
              <button
                type="button"
                className="sweet-modal-close"
                onClick={() => setOpcaoReceita(null)}
              >
                ×
              </button>

              <span className="page-kicker">RECEITA DA OPÇÃO</span>
              <h2>{opcaoReceita.name}</h2>

              <div className="custom-builder-recipe-placeholder">
                <strong>Pronto para a próxima etapa</strong>
                <p>
                  O botão já está no lugar certo. Agora vamos ligar uma receita
                  completa a <strong>{opcaoReceita.name}</strong>, com ingredientes,
                  rendimento, validade, “Fazer receita” e baixa automática do estoque.
                </p>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="sweet-new-batch-button"
                  onClick={() => setOpcaoReceita(null)}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CONFIRMAÇÕES */}
        {grupoExcluindo && (
          <div className="delete-modal-overlay">
            <div className="inventory-modal">
              <h2>Excluir grupo?</h2>
              <p>
                O grupo <strong>{grupoExcluindo.name}</strong> e suas opções serão
                excluídos.
              </p>

              <div className="inventory-edit-actions">
                <button
                  type="button"
                  className="delete-modal-cancel"
                  onClick={() => setGrupoExcluindo(null)}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="sweet-delete-confirm-button"
                  onClick={excluirGrupo}
                >
                  Excluir grupo
                </button>
              </div>
            </div>
          </div>
        )}

        {opcaoExcluindo && (
          <div className="delete-modal-overlay">
            <div className="inventory-modal">
              <h2>Excluir opção?</h2>
              <p>
                Você está prestes a excluir{" "}
                <strong>{opcaoExcluindo.name}</strong>.
              </p>

              <div className="inventory-edit-actions">
                <button
                  type="button"
                  className="delete-modal-cancel"
                  onClick={() => setOpcaoExcluindo(null)}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="sweet-delete-confirm-button"
                  onClick={excluirOpcao}
                >
                  Excluir opção
                </button>
              </div>
            </div>
          </div>
        )}

        {criacaoExcluindo && (
          <div className="delete-modal-overlay">
            <div className="inventory-modal">
              <h2>Excluir criação?</h2>
              <p>
                Você está prestes a excluir{" "}
                <strong>{criacaoExcluindo.name}</strong>.
              </p>

              <div className="inventory-edit-actions">
                <button
                  type="button"
                  className="delete-modal-cancel"
                  onClick={() => setCriacaoExcluindo(null)}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="sweet-delete-confirm-button"
                  onClick={excluirCriacao}
                >
                  Excluir criação
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
