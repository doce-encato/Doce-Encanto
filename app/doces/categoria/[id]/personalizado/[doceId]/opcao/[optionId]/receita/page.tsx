"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  calcularCustosMediosPonderados,
  normalizarQuantidadeParaBase,
} from "@/lib/custos";

type Categoria = {
  id: number;
  name: string;
};

type Opcao = {
  id: number;
  part_id: number;
  name: string;
  quantity: number;
};

type Grupo = {
  id: number;
  sweet_id: number;
  name: string;
};

type EstoqueItem = {
  id: number;
  name: string;
  unit: string;
};

type IngredienteReceita = {
  inventory_item_id: number;
  name: string;
  quantity: string;
  unit: string;
};

type Receita = {
  id: number;
  sweet_id: number | null;
  option_id: number | null;
  name: string;
  yield_quantity: number;
  shelf_life_days: number;
};

type ReceitaItemBanco = {
  id: number;
  recipe_id: number;
  inventory_item_id: number;
  quantity: number;
  unit: string;
  inventory_items:
    | { id: number; name: string; unit: string }
    | { id: number; name: string; unit: string }[]
    | null;
};

type CompraHistorica = {
  inventory_item_id: number | null;
  quantity: number;
  unit: string;
  total_price: number;
};

type ResultadoProducao = {
  batch_id?: number;
  produced_quantity?: number;
  expires_at?: string;
  depleted_ingredients?: Array<{
    id: number;
    name: string;
  }>;
};

function numero(valor: string) {
  const convertido = Number(valor.trim().replace(",", "."));
  return Number.isFinite(convertido) ? convertido : NaN;
}

function formatarUnidade(unidade: string) {
  return unidade === "unidade" ? "un" : unidade;
}

function formatarPreco(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarCustoMedio(valorBase: number, unidadeBase: string) {
  if (unidadeBase === "g") {
    return `${formatarPreco(valorBase * 1000)}/kg`;
  }

  if (unidadeBase === "ml") {
    return `${formatarPreco(valorBase * 1000)}/L`;
  }

  return `${formatarPreco(valorBase)}/${formatarUnidade(unidadeBase)}`;
}

function unidadesPermitidas(unidadeBase: string) {
  if (unidadeBase === "g" || unidadeBase === "kg") return ["g", "kg"];
  if (unidadeBase === "ml" || unidadeBase === "L") return ["ml", "L"];
  return ["unidade"];
}

function unidadeInicial(unidadeBase: string) {
  if (unidadeBase === "g" || unidadeBase === "kg") return "g";
  if (unidadeBase === "ml" || unidadeBase === "L") return "ml";
  return "unidade";
}

function hojeLocal() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function adicionarDias(data: string, dias: number) {
  if (!data) return "";

  const [ano, mes, dia] = data.split("-").map(Number);
  const base = new Date(ano, mes - 1, dia);
  base.setDate(base.getDate() + dias);

  return [
    base.getFullYear(),
    String(base.getMonth() + 1).padStart(2, "0"),
    String(base.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatarData(data: string) {
  if (!data) return "—";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

export default function ReceitaPage() {
  const params = useParams();

  const categoriaId = Number(params.id);
  const doceId = Number(params.doceId);
  const optionId = Number(params.optionId);

  const [categoria, setCategoria] = useState<Categoria | null>(null);
  const [opcao, setOpcao] = useState<Opcao | null>(null);
  const [grupo, setGrupo] = useState<Grupo | null>(null);
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [ingredientesPorReceita, setIngredientesPorReceita] = useState<
    Record<number, IngredienteReceita[]>
  >({});
  const [estoque, setEstoque] = useState<EstoqueItem[]>([]);
  const [custosMedios, setCustosMedios] = useState<Map<number, number>>(
    new Map()
  );
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  // Nova / editar receita
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [receitaEditando, setReceitaEditando] = useState<Receita | null>(null);
  const [nomeReceita, setNomeReceita] = useState("Receita principal");
  const [rendimento, setRendimento] = useState("");
  const [validadeDias, setValidadeDias] = useState("");
  const [ingredientes, setIngredientes] = useState<IngredienteReceita[]>([]);
  const [salvando, setSalvando] = useState(false);

  // Busca de ingrediente
  const [buscaIngrediente, setBuscaIngrediente] = useState("");
  const [ingredienteSelecionado, setIngredienteSelecionado] =
    useState<EstoqueItem | null>(null);
  const [quantidadeIngrediente, setQuantidadeIngrediente] = useState("");
  const [unidadeIngrediente, setUnidadeIngrediente] = useState("");
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);

  // Exclusão
  const [receitaExcluindo, setReceitaExcluindo] = useState<Receita | null>(
    null
  );
  const [excluindo, setExcluindo] = useState(false);

  // Produção
  const [receitaProduzindo, setReceitaProduzindo] = useState<Receita | null>(
    null
  );
  const [numeroReceitas, setNumeroReceitas] = useState("1");
  const [quantidadeProduzida, setQuantidadeProduzida] = useState("");
  const [dataProducao, setDataProducao] = useState(hojeLocal());
  const [codigoLote, setCodigoLote] = useState("");
  const [diasAlerta, setDiasAlerta] = useState("2");
  const [produzindo, setProduzindo] = useState(false);

  const [mensagemSucesso, setMensagemSucesso] = useState("");
  const [ingredientesZerados, setIngredientesZerados] = useState<string[]>([]);

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

    const { data: opcaoData, error: opcaoError } = await supabase
      .from("sweet_part_options")
      .select("id, part_id, name, quantity")
      .eq("id", optionId)
      .single();

    if (opcaoError || !opcaoData) {
      console.error(opcaoError);
      setErro("Não foi possível carregar a opção.");
      setCarregando(false);
      return;
    }

    const { data: grupoData, error: grupoError } = await supabase
      .from("sweet_parts")
      .select("id, sweet_id, name")
      .eq("id", Number(opcaoData.part_id))
      .eq("sweet_id", doceId)
      .single();

    if (grupoError || !grupoData) {
      console.error(grupoError);
      setErro("Esta opção não pertence a este personalizável.");
      setCarregando(false);
      return;
    }

    setOpcao({
      id: Number(opcaoData.id),
      part_id: Number(opcaoData.part_id),
      name: String(opcaoData.name),
      quantity: Number(opcaoData.quantity ?? 0),
    });

    setGrupo({
      id: Number(grupoData.id),
      sweet_id: Number(grupoData.sweet_id),
      name: String(grupoData.name),
    });

    const { data: estoqueData, error: estoqueError } = await supabase
      .from("inventory_items")
      .select("id, name, unit")
      .order("name");

    let estoqueConvertido: EstoqueItem[] = [];

    if (estoqueError) {
      console.error(estoqueError);
      setErro("Não foi possível carregar os ingredientes do estoque.");
      setEstoque([]);
      setCustosMedios(new Map());
    } else {
      estoqueConvertido = (estoqueData ?? []).map((item) => ({
        id: Number(item.id),
        name: String(item.name),
        unit: String(item.unit),
      }));

      setEstoque(estoqueConvertido);

      const { data: comprasData, error: comprasError } = await supabase
        .from("purchase_items")
        .select("inventory_item_id, quantity, unit, total_price")
        .not("inventory_item_id", "is", null);

      if (comprasError) {
        console.error(comprasError);
        setCustosMedios(new Map());
      } else {
        const unidadesBase = new Map<number, string>(
          estoqueConvertido.map((item) => [item.id, item.unit])
        );

        const compras: CompraHistorica[] = (comprasData ?? []).map((item) => ({
          inventory_item_id:
            item.inventory_item_id == null
              ? null
              : Number(item.inventory_item_id),
          quantity: Number(item.quantity ?? 0),
          unit: String(item.unit),
          total_price: Number(item.total_price ?? 0),
        }));

        setCustosMedios(
          calcularCustosMediosPonderados(compras, unidadesBase)
        );
      }
    }

    const { data: receitasData, error: receitasError } = await supabase
      .from("sweet_recipes")
      .select("id, sweet_id, option_id, name, yield_quantity, shelf_life_days")
      .eq("option_id", optionId)
      .order("created_at", { ascending: true });

    if (receitasError) {
      console.error(receitasError);
      setErro("Não foi possível carregar as receitas.");
      setCarregando(false);
      return;
    }

    const receitasConvertidas: Receita[] = (receitasData ?? []).map(
      (receita) => ({
        id: Number(receita.id),
        sweet_id: receita.sweet_id == null ? null : Number(receita.sweet_id),
        option_id: receita.option_id == null ? null : Number(receita.option_id),
        name: String(receita.name),
        yield_quantity: Number(receita.yield_quantity),
        shelf_life_days: Number(receita.shelf_life_days),
      })
    );

    setReceitas(receitasConvertidas);

    const ids = receitasConvertidas.map((receita) => receita.id);

    if (ids.length === 0) {
      setIngredientesPorReceita({});
      setCarregando(false);
      return;
    }

    const { data: itensData, error: itensError } = await supabase
      .from("sweet_recipe_items")
      .select(`
        id,
        recipe_id,
        inventory_item_id,
        quantity,
        unit,
        inventory_items (
          id,
          name,
          unit
        )
      `)
      .in("recipe_id", ids)
      .order("id");

    if (itensError) {
      console.error(itensError);
      setErro("Não foi possível carregar os ingredientes das receitas.");
    } else {
      const mapa: Record<number, IngredienteReceita[]> = {};

      ((itensData ?? []) as ReceitaItemBanco[]).forEach((item) => {
        const inventory = Array.isArray(item.inventory_items)
          ? item.inventory_items[0]
          : item.inventory_items;

        if (!inventory) return;

        if (!mapa[item.recipe_id]) mapa[item.recipe_id] = [];

        mapa[item.recipe_id].push({
          inventory_item_id: Number(item.inventory_item_id),
          name: String(inventory.name),
          quantity: String(item.quantity),
          unit: String(item.unit),
        });
      });

      setIngredientesPorReceita(mapa);
    }

    setCarregando(false);
  }

  useEffect(() => {
    if (categoriaId && doceId && optionId) carregarPagina();
  }, [categoriaId, doceId, optionId]);

  const sugestoesIngredientes = useMemo(() => {
    const busca = buscaIngrediente.trim().toLowerCase();
    if (!busca) return [];

    return estoque
      .filter((item) => {
        const jaAdicionado = ingredientes.some(
          (ingrediente) => ingrediente.inventory_item_id === item.id
        );

        return !jaAdicionado && item.name.toLowerCase().includes(busca);
      })
      .slice(0, 8);
  }, [buscaIngrediente, estoque, ingredientes]);

  function calcularCustoIngrediente(ingrediente: IngredienteReceita) {
    const itemEstoque = estoque.find(
      (item) => item.id === ingrediente.inventory_item_id
    );

    if (!itemEstoque) {
      return { custo: null as number | null, custoMedioTexto: "Sem cadastro" };
    }

    const custoMedio = custosMedios.get(ingrediente.inventory_item_id);

    if (custoMedio == null) {
      return {
        custo: null as number | null,
        custoMedioTexto: "Sem histórico de compra",
      };
    }

    const quantidadeNormalizada = normalizarQuantidadeParaBase(
      Number(ingrediente.quantity),
      ingrediente.unit,
      itemEstoque.unit
    );

    if (quantidadeNormalizada == null) {
      return {
        custo: null as number | null,
        custoMedioTexto: "Unidade incompatível",
      };
    }

    return {
      custo: quantidadeNormalizada * custoMedio,
      custoMedioTexto: formatarCustoMedio(custoMedio, itemEstoque.unit),
    };
  }

  function calcularResumoReceita(
    receita: Receita,
    itens: IngredienteReceita[]
  ) {
    let custoParcial = 0;
    let pendentes = 0;

    itens.forEach((ingrediente) => {
      const resultado = calcularCustoIngrediente(ingrediente);

      if (resultado.custo == null) {
        pendentes += 1;
        return;
      }

      custoParcial += resultado.custo;
    });

    const custoCompleto = itens.length > 0 && pendentes === 0;
    const custoPorUnidade =
      custoCompleto && receita.yield_quantity > 0
        ? custoParcial / receita.yield_quantity
        : null;

    return {
      custoParcial,
      custoCompleto,
      custoPorUnidade,
      pendentes,
    };
  }

  function limparIngredienteSelecionado() {
    setIngredienteSelecionado(null);
    setBuscaIngrediente("");
    setQuantidadeIngrediente("");
    setUnidadeIngrediente("");
    setMostrarSugestoes(false);
  }

  function selecionarIngrediente(item: EstoqueItem) {
    setIngredienteSelecionado(item);
    setBuscaIngrediente(item.name);
    setUnidadeIngrediente(unidadeInicial(item.unit));
    setQuantidadeIngrediente("");
    setMostrarSugestoes(false);
  }

  function adicionarIngrediente() {
    setErro("");

    if (!ingredienteSelecionado) {
      setErro("Selecione um ingrediente do estoque.");
      return;
    }

    const quantidade = numero(quantidadeIngrediente);

    if (Number.isNaN(quantidade) || quantidade <= 0) {
      setErro("Informe uma quantidade válida para o ingrediente.");
      return;
    }

    setIngredientes((atuais) => [
      ...atuais,
      {
        inventory_item_id: ingredienteSelecionado.id,
        name: ingredienteSelecionado.name,
        quantity: String(quantidade),
        unit: unidadeIngrediente,
      },
    ]);

    limparIngredienteSelecionado();
  }

  function removerIngrediente(index: number) {
    setIngredientes((atuais) =>
      atuais.filter((_, indice) => indice !== index)
    );
  }

  function abrirNovaReceita() {
    setErro("");
    setReceitaEditando(null);
    setNomeReceita("Receita principal");
    setRendimento("");
    setValidadeDias("");
    setIngredientes([]);
    limparIngredienteSelecionado();
    setMostrarFormulario(true);
  }

  function abrirEdicao(receita: Receita) {
    setErro("");
    setReceitaEditando(receita);
    setNomeReceita(receita.name);
    setRendimento(String(receita.yield_quantity));
    setValidadeDias(String(receita.shelf_life_days));
    setIngredientes(ingredientesPorReceita[receita.id] ?? []);
    limparIngredienteSelecionado();
    setMostrarFormulario(true);
  }

  function fecharFormulario() {
    if (salvando) return;

    setMostrarFormulario(false);
    setReceitaEditando(null);
    setNomeReceita("Receita principal");
    setRendimento("");
    setValidadeDias("");
    setIngredientes([]);
    limparIngredienteSelecionado();
    setErro("");
  }

  async function salvarReceita() {
    setErro("");

    if (!nomeReceita.trim()) {
      setErro("Digite o nome da receita.");
      return;
    }

    const rendimentoNumero = numero(rendimento);

    if (Number.isNaN(rendimentoNumero) || rendimentoNumero <= 0) {
      setErro("Informe quantas unidades essa receita rende.");
      return;
    }

    const validadeNumero = Number(validadeDias);

    if (
      Number.isNaN(validadeNumero) ||
      validadeNumero < 0 ||
      !Number.isInteger(validadeNumero)
    ) {
      setErro("Informe uma validade válida em dias.");
      return;
    }

    if (ingredientes.length === 0) {
      setErro("Adicione pelo menos um ingrediente.");
      return;
    }

    setSalvando(true);

    let receitaId: number;
    const eraEdicao = Boolean(receitaEditando);

    if (receitaEditando) {
      const { error: receitaError } = await supabase
        .from("sweet_recipes")
        .update({
          name: nomeReceita.trim(),
          yield_quantity: rendimentoNumero,
          shelf_life_days: validadeNumero,
          updated_at: new Date().toISOString(),
        })
        .eq("id", receitaEditando.id);

      if (receitaError) {
        console.error(receitaError);
        setErro("Não foi possível editar a receita.");
        setSalvando(false);
        return;
      }

      receitaId = receitaEditando.id;

      const { error: apagarItensError } = await supabase
        .from("sweet_recipe_items")
        .delete()
        .eq("recipe_id", receitaId);

      if (apagarItensError) {
        console.error(apagarItensError);
        setErro("Não foi possível atualizar os ingredientes da receita.");
        setSalvando(false);
        return;
      }
    } else {
      const { data: receitaCriada, error: receitaError } = await supabase
        .from("sweet_recipes")
        .insert({
          sweet_id: null,
          option_id: optionId,
          name: nomeReceita.trim(),
          yield_quantity: rendimentoNumero,
          shelf_life_days: validadeNumero,
        })
        .select("id")
        .single();

      if (receitaError || !receitaCriada) {
        console.error(receitaError);
        setErro("Não foi possível criar a receita.");
        setSalvando(false);
        return;
      }

      receitaId = Number(receitaCriada.id);
    }

    const itensParaSalvar = ingredientes.map((ingrediente) => ({
      recipe_id: receitaId,
      inventory_item_id: ingrediente.inventory_item_id,
      quantity: numero(ingrediente.quantity),
      unit: ingrediente.unit,
    }));

    const { error: ingredientesError } = await supabase
      .from("sweet_recipe_items")
      .insert(itensParaSalvar);

    if (ingredientesError) {
      console.error(ingredientesError);

      // Se era uma criação nova e os itens falharem,
      // removemos a receita vazia para não deixar cadastro quebrado.
      if (!eraEdicao) {
        await supabase.from("sweet_recipes").delete().eq("id", receitaId);
      }

      setErro(
        eraEdicao
          ? "A receita foi alterada, mas houve erro ao salvar os ingredientes."
          : "Não foi possível salvar os ingredientes da receita."
      );
      setSalvando(false);
      return;
    }

    setSalvando(false);
    setMostrarFormulario(false);
    setReceitaEditando(null);
    setMensagemSucesso(
      eraEdicao
        ? "Receita atualizada com sucesso."
        : "Receita cadastrada com sucesso."
    );
    setIngredientesZerados([]);

    await carregarPagina();
  }

  async function excluirReceita() {
    if (!receitaExcluindo) return;

    setExcluindo(true);
    setErro("");

    const { error } = await supabase
      .from("sweet_recipes")
      .delete()
      .eq("id", receitaExcluindo.id);

    if (error) {
      console.error(error);
      setErro("Não foi possível excluir a receita.");
      setExcluindo(false);
      return;
    }

    setReceitaExcluindo(null);
    setExcluindo(false);
    setMensagemSucesso("Receita excluída.");
    setIngredientesZerados([]);

    await carregarPagina();
  }

  // ===========================================
  // FAZER RECEITA
  // ===========================================

  function abrirProducao(receita: Receita) {
    setErro("");
    setMensagemSucesso("");
    setIngredientesZerados([]);

    setReceitaProduzindo(receita);
    setNumeroReceitas("1");
    setQuantidadeProduzida(String(receita.yield_quantity));
    setDataProducao(hojeLocal());
    setCodigoLote("");
    setDiasAlerta("2");
  }

  function fecharProducao() {
    if (produzindo) return;

    setReceitaProduzindo(null);
    setNumeroReceitas("1");
    setQuantidadeProduzida("");
    setDataProducao(hojeLocal());
    setCodigoLote("");
    setDiasAlerta("2");
    setErro("");
  }

  function mudarNumeroReceitas(valor: string) {
    setNumeroReceitas(valor);

    if (!receitaProduzindo) return;

    const multiplicador = numero(valor);

    if (!Number.isNaN(multiplicador) && multiplicador > 0) {
      const esperado = receitaProduzindo.yield_quantity * multiplicador;
      setQuantidadeProduzida(String(esperado));
    }
  }

  const rendimentoEsperado = useMemo(() => {
    if (!receitaProduzindo) return 0;

    const multiplicador = numero(numeroReceitas);

    if (Number.isNaN(multiplicador) || multiplicador <= 0) return 0;

    return receitaProduzindo.yield_quantity * multiplicador;
  }, [receitaProduzindo, numeroReceitas]);

  const vencimentoPrevisto = useMemo(() => {
    if (!receitaProduzindo || !dataProducao) return "";

    return adicionarDias(
      dataProducao,
      receitaProduzindo.shelf_life_days
    );
  }, [receitaProduzindo, dataProducao]);

  async function confirmarProducao() {
    if (!receitaProduzindo) return;

    setErro("");
    setMensagemSucesso("");
    setIngredientesZerados([]);

    const multiplicador = numero(numeroReceitas);
    const quantidadeReal = numero(quantidadeProduzida);
    const alerta = Number(diasAlerta);

    if (Number.isNaN(multiplicador) || multiplicador <= 0) {
      setErro("Informe quantas receitas serão feitas.");
      return;
    }

    if (Number.isNaN(quantidadeReal) || quantidadeReal <= 0) {
      setErro("Informe a quantidade realmente produzida.");
      return;
    }

    if (!dataProducao) {
      setErro("Informe a data da produção.");
      return;
    }

    if (
      Number.isNaN(alerta) ||
      alerta < 0 ||
      !Number.isInteger(alerta)
    ) {
      setErro("Informe um alerta válido em dias.");
      return;
    }

    setProduzindo(true);

    const { data, error } = await supabase.rpc("produce_sweet_option_recipe", {
      p_recipe_id: receitaProduzindo.id,
      p_recipe_count: multiplicador,
      p_actual_quantity: quantidadeReal,
      p_produced_at: dataProducao,
      p_batch_code: codigoLote.trim() || null,
      p_alert_days_before: alerta,
    });

    if (error) {
      console.error(error);
      setErro(
        "Não foi possível concluir a produção. Verifique se o SQL de produção foi instalado no Supabase."
      );
      setProduzindo(false);
      return;
    }

    const resultado = (data ?? {}) as ResultadoProducao;

    const zerados = (resultado.depleted_ingredients ?? []).map(
      (item) => item.name
    );

    setProduzindo(false);
    setReceitaProduzindo(null);
    setMensagemSucesso(
      `${quantidadeReal.toLocaleString("pt-BR", {
        maximumFractionDigits: 3,
      })} unidades adicionadas ao estoque de ${opcao?.name ?? "opção"}.`
    );
    setIngredientesZerados(zerados);

    await carregarPagina();
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

  if (!categoria || !opcao || !grupo) {
    return (
      <main className="compras-page">
        <div className="page-shell">
          <Link
            href={`/doces/categoria/${categoriaId}/personalizado/${doceId}`}
            className="back-button"
          >
            ←
          </Link>

          <div className="empty-purchases">
            <strong>Opção não encontrada</strong>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="compras-page">
      <style jsx>{`
        .sweet-option-recipe-v2-toolbar {
          display: flex;
          align-items: stretch;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 18px;
        }

        .sweet-option-recipe-v2-stock {
          min-width: 150px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 2px;
          padding: 10px 13px;
          border: 1px solid #eadfd8;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.82);
          box-shadow: 0 4px 12px rgba(104, 44, 17, 0.05);
        }

        .sweet-option-recipe-v2-stock span {
          color: #8a756c;
          font-size: 11px;
          font-weight: 700;
        }

        .sweet-option-recipe-v2-stock strong {
          color: var(--brown);
          font-size: 17px;
          font-weight: 900;
        }

        .sweet-option-recipe-v2-add {
          width: auto;
          min-width: 150px;
          margin: 0;
        }

        .sweet-recipe-material-note {
          margin-top: 8px;
          padding: 9px 11px;
          border-radius: 12px;
          background: #fff8f2;
          color: #846e64;
          font-size: 12px;
          line-height: 1.4;
        }

        @media (max-width: 560px) {
          .sweet-option-recipe-v2-toolbar {
            flex-direction: column;
          }

          .sweet-option-recipe-v2-stock,
          .sweet-option-recipe-v2-add {
            width: 100%;
          }

          .sweet-option-recipe-v2-stock {
            min-height: 54px;
          }

          .sweet-recipe-material-note {
            font-size: 11px;
          }
        }
      `}</style>
      <div className="page-shell">
        <header className="page-header">
          <Link
            href={`/doces/categoria/${categoriaId}/personalizado/${doceId}`}
            className="back-button"
          >
            ←
          </Link>

          <div>
            <span className="page-kicker">RECEITA</span>
            <h1>{opcao.name}</h1>
            <p>{grupo.name} • Monte a receita, veja o custo dos ingredientes e faça a produção.</p>
          </div>
        </header>

        <div className="sweet-option-recipe-v2-toolbar">
          <div className="sweet-option-recipe-v2-stock">
            <span>Pronto em estoque</span>
            <strong>
              {Number(opcao.quantity || 0).toLocaleString("pt-BR", {
                maximumFractionDigits: 3,
              })} un
            </strong>
          </div>

          <button
            type="button"
            className="inventory-add-button sweet-option-recipe-v2-add"
            onClick={abrirNovaReceita}
          >
            + Nova receita
          </button>
        </div>

        {mensagemSucesso && (
          <div className="sweet-production-success">
            <strong>✓ {mensagemSucesso}</strong>

            {ingredientesZerados.length > 0 && (
              <div className="sweet-production-zero-warning">
                <span>Estes ingredientes chegaram a 0 no estoque:</span>

                <ul>
                  {ingredientesZerados.map((nome) => (
                    <li key={nome}>{nome}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <section className="sweet-recipe-section">
          {erro &&
            !mostrarFormulario &&
            !receitaExcluindo &&
            !receitaProduzindo && <div className="form-error">{erro}</div>}

          {receitas.length === 0 ? (
            <div className="empty-purchases">
              <strong>Nenhuma receita cadastrada</strong>
              <p>Cadastre a primeira receita desta opção.</p>
            </div>
          ) : (
            <div className="sweet-recipe-list">
              {receitas.map((receita) => {
                const itens = ingredientesPorReceita[receita.id] ?? [];
                const resumoCusto = calcularResumoReceita(receita, itens);

                return (
                  <article key={receita.id} className="sweet-recipe-card">
                    <div className="sweet-recipe-card-header">
                      <div>
                        <span className="section-kicker">RECEITA</span>
                        <h2>{receita.name}</h2>
                      </div>

                      <button
                        type="button"
                        className="sweet-recipe-edit-button"
                        onClick={() => abrirEdicao(receita)}
                      >
                        Editar
                      </button>
                    </div>

                    <div className="sweet-recipe-summary">
                      <div>
                        <span>Rendimento</span>
                        <strong>
                          {receita.yield_quantity.toLocaleString("pt-BR", {
                            maximumFractionDigits: 2,
                          })}{" "}
                          un
                        </strong>
                      </div>

                      <div>
                        <span>Validade</span>
                        <strong>
                          {receita.shelf_life_days}{" "}
                          {receita.shelf_life_days === 1 ? "dia" : "dias"}
                        </strong>
                      </div>
                    </div>

                    <div className="sweet-recipe-ingredients">
                      <span>Ingredientes</span>

                      {itens.length === 0 ? (
                        <p>Nenhum ingrediente cadastrado.</p>
                      ) : (
                        <div className="sweet-recipe-ingredient-list">
                          {itens.map((ingrediente) => {
                            const custoIngrediente =
                              calcularCustoIngrediente(ingrediente);

                            return (
                              <div
                                key={ingrediente.inventory_item_id}
                                className="sweet-recipe-ingredient-row sweet-recipe-cost-row"
                              >
                                <div className="sweet-recipe-cost-main">
                                  <strong>{ingrediente.name}</strong>
                                  <span>
                                    {Number(ingrediente.quantity).toLocaleString(
                                      "pt-BR",
                                      { maximumFractionDigits: 3 }
                                    )}{" "}
                                    {formatarUnidade(ingrediente.unit)}
                                  </span>
                                </div>

                                <div className="sweet-recipe-cost-values">
                                  <small>
                                    Custo médio: {custoIngrediente.custoMedioTexto}
                                  </small>

                                  {custoIngrediente.custo == null ? (
                                    <strong className="sweet-recipe-cost-missing">
                                      Custo não calculado
                                    </strong>
                                  ) : (
                                    <strong>
                                      {formatarPreco(custoIngrediente.custo)}
                                    </strong>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="sweet-recipe-cost-summary">
                      <div>
                        <span>
                          {resumoCusto.custoCompleto
                            ? "Matéria-prima da receita"
                            : "Matéria-prima parcial"}
                        </span>
                        <strong>{formatarPreco(resumoCusto.custoParcial)}</strong>
                      </div>

                      <div>
                        <span>Matéria-prima por unidade</span>
                        <strong>
                          {resumoCusto.custoPorUnidade == null
                            ? "—"
                            : formatarPreco(resumoCusto.custoPorUnidade)}
                        </strong>
                      </div>
                    </div>

                    <div className="sweet-recipe-material-note">
                      Este valor considera somente os ingredientes da receita.
                    </div>

                    {resumoCusto.pendentes > 0 && (
                      <div className="sweet-recipe-cost-warning">
                        <strong>⚠ Custo incompleto</strong>
                        <span>
                          {resumoCusto.pendentes === 1
                            ? "1 ingrediente está sem custo calculado."
                            : `${resumoCusto.pendentes} ingredientes estão sem custo calculado.`}
                        </span>
                      </div>
                    )}

                    <div className="sweet-recipe-card-actions">
                      <button
                        type="button"
                        className="sweet-recipe-produce-button"
                        onClick={() => abrirProducao(receita)}
                      >
                        🍫 Fazer receita
                      </button>

                      <button
                        type="button"
                        className="sweet-recipe-delete-button"
                        onClick={() => {
                          setErro("");
                          setReceitaExcluindo(receita);
                        }}
                      >
                        Excluir receita
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* NOVA / EDITAR RECEITA */}
        {mostrarFormulario && (
          <div className="sweet-modal-overlay" onClick={fecharFormulario}>
            <div
              className="sweet-modal-box sweet-recipe-modal"
              onClick={(evento) => evento.stopPropagation()}
            >
              <button
                type="button"
                className="sweet-modal-close"
                onClick={fecharFormulario}
              >
                ×
              </button>

              <span className="page-kicker">
                {receitaEditando ? "EDITAR RECEITA" : "NOVA RECEITA"}
              </span>

              <h2>{receitaEditando ? receitaEditando.name : opcao.name}</h2>

              <div className="form-group">
                <label>Nome da receita</label>
                <input
                  type="text"
                  value={nomeReceita}
                  onChange={(evento) => setNomeReceita(evento.target.value)}
                  placeholder="Ex.: Receita principal"
                />
              </div>

              <div className="sweet-recipe-main-fields">
                <div className="form-group">
                  <label>Rendimento</label>

                  <div className="input-with-unit">
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      value={rendimento}
                      onChange={(evento) => setRendimento(evento.target.value)}
                      placeholder="Ex.: 20"
                    />
                    <span>un</span>
                  </div>
                </div>

                <div className="form-group">
                  <label>Validade</label>

                  <div className="input-with-unit">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={validadeDias}
                      onChange={(evento) => setValidadeDias(evento.target.value)}
                      placeholder="Ex.: 7"
                    />
                    <span>dias</span>
                  </div>
                </div>
              </div>

              <div className="sweet-recipe-divider" />

              <div className="sweet-recipe-form-title">
                <span className="section-kicker">INGREDIENTES</span>
                <h3>Monte a receita</h3>
              </div>

              <div className="form-group sweet-recipe-search-group">
                <label>Buscar ingrediente</label>

                <div className="sweet-recipe-search-wrapper">
                  <input
                    type="text"
                    value={buscaIngrediente}
                    onChange={(evento) => {
                      setBuscaIngrediente(evento.target.value);
                      setIngredienteSelecionado(null);
                      setQuantidadeIngrediente("");
                      setUnidadeIngrediente("");
                      setMostrarSugestoes(true);
                    }}
                    onFocus={() => setMostrarSugestoes(true)}
                    placeholder="Ex.: Leite condensado"
                    autoComplete="off"
                  />

                  {mostrarSugestoes &&
                    buscaIngrediente.trim() &&
                    !ingredienteSelecionado && (
                      <div className="sweet-recipe-search-results">
                        {sugestoesIngredientes.length === 0 ? (
                          <div className="sweet-recipe-no-result">
                            Nenhum ingrediente encontrado
                          </div>
                        ) : (
                          sugestoesIngredientes.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => selecionarIngrediente(item)}
                            >
                              <strong>{item.name}</strong>
                              <span>
                                Estoque em {formatarUnidade(item.unit)}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                </div>
              </div>

              {ingredienteSelecionado && (
                <>
                  <div className="sweet-recipe-selected-ingredient">
                    <div>
                      <span>Ingrediente selecionado</span>
                      <strong>{ingredienteSelecionado.name}</strong>
                    </div>

                    <button
                      type="button"
                      onClick={limparIngredienteSelecionado}
                    >
                      Trocar
                    </button>
                  </div>

                  <div className="sweet-recipe-add-row">
                    <div className="form-group">
                      <label>Quantidade</label>
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        value={quantidadeIngrediente}
                        onChange={(evento) =>
                          setQuantidadeIngrediente(evento.target.value)
                        }
                        placeholder="Ex.: 790"
                      />
                    </div>

                    <div className="form-group">
                      <label>Unidade</label>

                      <select
                        value={unidadeIngrediente}
                        onChange={(evento) =>
                          setUnidadeIngrediente(evento.target.value)
                        }
                      >
                        {unidadesPermitidas(ingredienteSelecionado.unit).map(
                          (unidade) => (
                            <option key={unidade} value={unidade}>
                              {formatarUnidade(unidade)}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <button
                      type="button"
                      className="sweet-recipe-add-ingredient-button"
                      onClick={adicionarIngrediente}
                    >
                      + Adicionar ingrediente
                    </button>
                  </div>
                </>
              )}

              {ingredientes.length > 0 && (
                <div className="sweet-recipe-form-ingredients">
                  {ingredientes.map((ingrediente, index) => (
                    <div
                      key={`${ingrediente.inventory_item_id}-${index}`}
                      className="sweet-recipe-form-ingredient"
                    >
                      <div>
                        <strong>{ingrediente.name}</strong>
                        <span>
                          {Number(ingrediente.quantity).toLocaleString(
                            "pt-BR",
                            { maximumFractionDigits: 3 }
                          )}{" "}
                          {formatarUnidade(ingrediente.unit)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => removerIngrediente(index)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {erro && <div className="form-error">{erro}</div>}

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={fecharFormulario}
                  disabled={salvando}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="sweet-new-batch-button"
                  onClick={salvarReceita}
                  disabled={salvando}
                >
                  {salvando
                    ? "Salvando..."
                    : receitaEditando
                      ? "Salvar alterações"
                      : "Salvar receita"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FAZER RECEITA */}
        {receitaProduzindo && (
          <div className="sweet-modal-overlay" onClick={fecharProducao}>
            <div
              className="sweet-modal-box sweet-production-modal"
              onClick={(evento) => evento.stopPropagation()}
            >
              <button
                type="button"
                className="sweet-modal-close"
                onClick={fecharProducao}
              >
                ×
              </button>

              <span className="page-kicker">PRODUÇÃO</span>
              <h2>Fazer {receitaProduzindo.name}</h2>

              <p className="sweet-production-description">
                Ao confirmar, os ingredientes serão descontados do estoque e
                será criado um novo lote de <strong>{opcao.name}</strong>.
              </p>

              <div className="form-group">
                <label>Quantas receitas?</label>

                <input
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={numeroReceitas}
                  onChange={(evento) =>
                    mudarNumeroReceitas(evento.target.value)
                  }
                />

                <small>
                  Pode usar 1, 2, 0,5 etc. Os ingredientes serão multiplicados
                  por esse valor.
                </small>
              </div>

              <div className="sweet-production-preview">
                <span>Rendimento esperado</span>
                <strong>
                  {rendimentoEsperado.toLocaleString("pt-BR", {
                    maximumFractionDigits: 3,
                  })}{" "}
                  un
                </strong>
              </div>

              <div className="form-group">
                <label>Quantidade realmente produzida</label>

                <div className="input-with-unit">
                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={quantidadeProduzida}
                    onChange={(evento) =>
                      setQuantidadeProduzida(evento.target.value)
                    }
                  />
                  <span>un</span>
                </div>

                <small>
                  Se render diferente do esperado, altere somente este número.
                </small>
              </div>

              <div className="sweet-date-grid">
                <div className="form-group">
                  <label>Data da produção</label>

                  <input
                    type="date"
                    value={dataProducao}
                    onChange={(evento) => setDataProducao(evento.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Vencimento</label>

                  <div className="sweet-production-readonly">
                    {vencimentoPrevisto
                      ? formatarData(vencimentoPrevisto)
                      : "—"}
                  </div>

                  <small>
                    Calculado automaticamente pela validade da receita.
                  </small>
                </div>
              </div>

              <div className="form-group">
                <label>Número ou nome do lote</label>

                <input
                  type="text"
                  value={codigoLote}
                  onChange={(evento) => setCodigoLote(evento.target.value)}
                  placeholder="Ex.: Lote 005"
                />

                <small>Opcional</small>
              </div>

              <div className="form-group">
                <label>Avisar quantos dias antes?</label>

                <div className="sweet-alert-shortcuts">
                  {[2, 7, 30, 180].map((dias) => (
                    <button
                      key={dias}
                      type="button"
                      className={Number(diasAlerta) === dias ? "active" : ""}
                      onClick={() => setDiasAlerta(String(dias))}
                    >
                      {dias === 180 ? "6 meses" : `${dias} dias`}
                    </button>
                  ))}
                </div>

                <div className="input-with-unit">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={diasAlerta}
                    onChange={(evento) => setDiasAlerta(evento.target.value)}
                  />
                  <span>dias</span>
                </div>
              </div>

              <div className="sweet-production-note">
                <strong>Como funciona o estoque</strong>
                <span>
                  Se algum ingrediente não tiver quantidade suficiente, ele
                  ficará em 0. A produção não será bloqueada e o estoque nunca
                  ficará negativo.
                </span>
              </div>

              {erro && <div className="form-error">{erro}</div>}

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={fecharProducao}
                  disabled={produzindo}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="sweet-recipe-confirm-production"
                  onClick={confirmarProducao}
                  disabled={produzindo}
                >
                  {produzindo ? "Produzindo..." : "Confirmar produção"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* EXCLUIR RECEITA */}
        {receitaExcluindo && (
          <div
            className="delete-modal-overlay"
            onClick={() => {
              if (!excluindo) {
                setReceitaExcluindo(null);
                setErro("");
              }
            }}
          >
            <div
              className="inventory-modal"
              onClick={(evento) => evento.stopPropagation()}
            >
              <h2>Excluir receita?</h2>

              <p>
                Você está prestes a excluir{" "}
                <strong>{receitaExcluindo.name}</strong>.
              </p>

              <div className="sweet-delete-warning">
                <strong>Atenção</strong>
                <span>
                  Os ingredientes vinculados a esta receita também serão
                  removidos.
                </span>
              </div>

              {erro && <div className="form-error">{erro}</div>}

              <div className="inventory-edit-actions">
                <button
                  type="button"
                  className="delete-modal-cancel"
                  onClick={() => {
                    setReceitaExcluindo(null);
                    setErro("");
                  }}
                  disabled={excluindo}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="sweet-delete-confirm-button"
                  onClick={excluirReceita}
                  disabled={excluindo}
                >
                  {excluindo ? "Excluindo..." : "Excluir receita"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
