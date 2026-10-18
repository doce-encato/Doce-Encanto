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
  cost_source: "recipe" | "inventory";
  inventory_item_id: number | null;
  inventory_quantity: number | null;
  inventory_unit: string | null;
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

type ReceitaCusto = {
  id: number;
  option_id: number | null;
  yield_quantity: number;
};

type ReceitaItemCusto = {
  recipe_id: number;
  inventory_item_id: number;
  quantity: number;
  unit: string;
};

type EstoqueCusto = {
  id: number;
  name: string;
  unit: string;
};

type CustoOpcao = {
  custoUnitario: number | null;
  semReceita: boolean;
  custoIncompleto: boolean;
  itensSemCusto: string[];
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

function formatarUnidade(unidade: string) {
  return unidade === "unidade" ? "un" : unidade;
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
  const [custosPorOpcao, setCustosPorOpcao] = useState<
    Record<number, CustoOpcao>
  >({});
  const [estoqueDireto, setEstoqueDireto] = useState<EstoqueCusto[]>([]);

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
  const [tipoCustoOpcao, setTipoCustoOpcao] = useState<"recipe" | "inventory">("recipe");
  const [inventoryItemOpcao, setInventoryItemOpcao] = useState("");
  const [inventoryQuantityOpcao, setInventoryQuantityOpcao] = useState("");
  const [inventoryUnitOpcao, setInventoryUnitOpcao] = useState("unidade");
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

  async function carregarCustosOpcoes(opcoesAtuais: Opcao[]) {
    const mapaInicial: Record<number, CustoOpcao> = {};

    opcoesAtuais.forEach((opcao) => {
      mapaInicial[opcao.id] = {
        custoUnitario: null,
        semReceita: opcao.cost_source === "recipe",
        custoIncompleto: false,
        itensSemCusto: [],
      };
    });

    setCustosPorOpcao(mapaInicial);

    if (opcoesAtuais.length === 0) return;

    const opcoesReceita = opcoesAtuais.filter(
      (opcao) => opcao.cost_source !== "inventory"
    );

    const opcoesEstoque = opcoesAtuais.filter(
      (opcao) => opcao.cost_source === "inventory"
    );

    const idsOpcoesReceita = opcoesReceita.map((opcao) => opcao.id);

    let receitas: ReceitaCusto[] = [];
    let itensReceita: ReceitaItemCusto[] = [];

    if (idsOpcoesReceita.length > 0) {
      const { data: receitasData, error: receitasError } = await supabase
        .from("sweet_recipes")
        .select("id, option_id, yield_quantity")
        .in("option_id", idsOpcoesReceita)
        .order("created_at", { ascending: true });

      if (receitasError) {
        console.error(receitasError);
        return;
      }

      receitas = (receitasData ?? []).map((receita) => ({
        id: Number(receita.id),
        option_id: receita.option_id == null ? null : Number(receita.option_id),
        yield_quantity: Number(receita.yield_quantity ?? 0),
      }));

      const idsReceitas = receitas.map((receita) => receita.id);

      if (idsReceitas.length > 0) {
        const { data: itensData, error: itensError } = await supabase
          .from("sweet_recipe_items")
          .select("recipe_id, inventory_item_id, quantity, unit")
          .in("recipe_id", idsReceitas);

        if (itensError) {
          console.error(itensError);
          return;
        }

        itensReceita = (itensData ?? []).map((item) => ({
          recipe_id: Number(item.recipe_id),
          inventory_item_id: Number(item.inventory_item_id),
          quantity: Number(item.quantity ?? 0),
          unit: String(item.unit),
        }));
      }
    }

    const idsEstoque = Array.from(
      new Set([
        ...itensReceita.map((item) => item.inventory_item_id),
        ...opcoesEstoque
          .map((opcao) => opcao.inventory_item_id)
          .filter((id): id is number => id != null),
      ])
    );

    const resultado: Record<number, CustoOpcao> = { ...mapaInicial };

    if (idsEstoque.length === 0) {
      opcoesReceita.forEach((opcao) => {
        const receitasDaOpcao = receitas.filter(
          (receita) => receita.option_id === opcao.id
        );

        if (receitasDaOpcao.length > 0) {
          resultado[opcao.id] = {
            custoUnitario: null,
            semReceita: false,
            custoIncompleto: true,
            itensSemCusto: [],
          };
        }
      });

      setCustosPorOpcao(resultado);
      return;
    }

    const { data: estoqueData, error: estoqueError } = await supabase
      .from("inventory_items")
      .select("id, name, unit")
      .in("id", idsEstoque);

    if (estoqueError) {
      console.error(estoqueError);
      return;
    }

    const estoqueCusto: EstoqueCusto[] = (estoqueData ?? []).map((item) => ({
      id: Number(item.id),
      name: String(item.name),
      unit: String(item.unit),
    }));

    const unidadesBase = new Map<number, string>(
      estoqueCusto.map((item) => [item.id, item.unit])
    );

    const nomesEstoque = new Map<number, string>(
      estoqueCusto.map((item) => [item.id, item.name])
    );

    const { data: comprasData, error: comprasError } = await supabase
      .from("purchase_items")
      .select("inventory_item_id, quantity, unit, total_price")
      .in("inventory_item_id", idsEstoque);

    if (comprasError) {
      console.error(comprasError);
      return;
    }

    const custosMedios = calcularCustosMediosPonderados(
      (comprasData ?? []).map((item) => ({
        inventory_item_id:
          item.inventory_item_id == null ? null : Number(item.inventory_item_id),
        quantity: Number(item.quantity ?? 0),
        unit: String(item.unit),
        total_price: Number(item.total_price ?? 0),
      })),
      unidadesBase
    );

    // Opções que usam uma receita produzida.
    opcoesReceita.forEach((opcao) => {
      const receitasDaOpcao = receitas.filter(
        (receita) => receita.option_id === opcao.id
      );

      if (receitasDaOpcao.length === 0) return;

      let custoUnitarioTotal = 0;
      let calculoCompleto = true;
      const semCusto = new Set<string>();

      receitasDaOpcao.forEach((receita) => {
        if (receita.yield_quantity <= 0) {
          calculoCompleto = false;
          return;
        }

        const itensDaReceita = itensReceita.filter(
          (item) => item.recipe_id === receita.id
        );

        if (itensDaReceita.length === 0) {
          calculoCompleto = false;
          return;
        }

        let custoReceita = 0;
        let receitaCompleta = true;

        itensDaReceita.forEach((item) => {
          const unidadeBase = unidadesBase.get(item.inventory_item_id);
          const custoMedio = custosMedios.get(item.inventory_item_id);
          const quantidadeNormalizada = unidadeBase
            ? normalizarQuantidadeParaBase(
                item.quantity,
                item.unit,
                unidadeBase
              )
            : null;

          if (
            unidadeBase == null ||
            custoMedio == null ||
            quantidadeNormalizada == null
          ) {
            receitaCompleta = false;
            calculoCompleto = false;
            semCusto.add(
              nomesEstoque.get(item.inventory_item_id) ??
                "Ingrediente sem histórico"
            );
            return;
          }

          custoReceita += quantidadeNormalizada * custoMedio;
        });

        if (receitaCompleta) {
          custoUnitarioTotal += custoReceita / receita.yield_quantity;
        }
      });

      resultado[opcao.id] = {
        custoUnitario: calculoCompleto ? custoUnitarioTotal : null,
        semReceita: false,
        custoIncompleto: !calculoCompleto,
        itensSemCusto: Array.from(semCusto),
      };
    });

    // Opções usadas diretamente do estoque: fruta, Nutella, Oreo etc.
    opcoesEstoque.forEach((opcao) => {
      if (
        opcao.inventory_item_id == null ||
        opcao.inventory_quantity == null ||
        !opcao.inventory_unit
      ) {
        resultado[opcao.id] = {
          custoUnitario: null,
          semReceita: false,
          custoIncompleto: true,
          itensSemCusto: [opcao.name],
        };
        return;
      }

      const unidadeBase = unidadesBase.get(opcao.inventory_item_id);
      const custoMedio = custosMedios.get(opcao.inventory_item_id);
      const quantidadeNormalizada = unidadeBase
        ? normalizarQuantidadeParaBase(
            opcao.inventory_quantity,
            opcao.inventory_unit,
            unidadeBase
          )
        : null;

      if (
        unidadeBase == null ||
        custoMedio == null ||
        quantidadeNormalizada == null
      ) {
        resultado[opcao.id] = {
          custoUnitario: null,
          semReceita: false,
          custoIncompleto: true,
          itensSemCusto: [
            nomesEstoque.get(opcao.inventory_item_id) ?? opcao.name,
          ],
        };
        return;
      }

      resultado[opcao.id] = {
        custoUnitario: quantidadeNormalizada * custoMedio,
        semReceita: false,
        custoIncompleto: false,
        itensSemCusto: [],
      };
    });

    setCustosPorOpcao(resultado);
  }

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

    const { data: estoqueDiretoData, error: estoqueDiretoError } = await supabase
      .from("inventory_items")
      .select("id, name, unit")
      .order("name", { ascending: true });

    if (estoqueDiretoError) {
      console.error(estoqueDiretoError);
      setEstoqueDireto([]);
    } else {
      setEstoqueDireto(
        (estoqueDiretoData ?? []).map((item) => ({
          id: Number(item.id),
          name: String(item.name),
          unit: String(item.unit),
        }))
      );
    }

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

    let opcoesConvertidas: Opcao[] = [];

    if (idsGrupos.length > 0) {
      const { data: opcoesData, error: opcoesError } = await supabase
        .from("sweet_part_options")
        .select("id, part_id, name, extra_price, cost_source, inventory_item_id, inventory_quantity, inventory_unit")
        .in("part_id", idsGrupos)
        .order("id", { ascending: true });

      if (opcoesError) {
        console.error(opcoesError);
        setErro("Não foi possível carregar as opções.");
      } else {
        opcoesConvertidas = (opcoesData ?? []).map((item) => ({
          id: Number(item.id),
          part_id: Number(item.part_id),
          name: String(item.name),
          extra_price: Number(item.extra_price ?? 0),
          cost_source:
            item.cost_source === "inventory" ? "inventory" : "recipe",
          inventory_item_id:
            item.inventory_item_id == null
              ? null
              : Number(item.inventory_item_id),
          inventory_quantity:
            item.inventory_quantity == null
              ? null
              : Number(item.inventory_quantity),
          inventory_unit:
            item.inventory_unit == null
              ? null
              : String(item.inventory_unit),
        }));
        setOpcoes(opcoesConvertidas);
      }
    } else {
      setOpcoes([]);
    }

    await carregarCustosOpcoes(opcoesConvertidas);

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


  const selecaoCompleta = useMemo(() => {
    if (grupos.length === 0) return false;
    return grupos.every((grupo) => {
      const quantidade = (selecoes[grupo.id] ?? []).length;
      return quantidade >= grupo.min_choices && quantidade <= grupo.max_choices;
    });
  }, [grupos, selecoes]);

  const resumoCustoSelecionado = useMemo(() => {
    const idsSelecionados = Object.values(selecoes).flat();
    let custoParcial = 0;
    let incompleto = false;
    const problemas = new Set<string>();

    idsSelecionados.forEach((opcaoId) => {
      const opcao = opcoes.find((item) => item.id === opcaoId);
      const custo = custosPorOpcao[opcaoId];
      if (!custo || custo.custoUnitario == null) {
        incompleto = true;
        if (opcao) problemas.add(opcao.name);
        return;
      }
      custoParcial += custo.custoUnitario;
    });

    return {
      quantidadeSelecionada: idsSelecionados.length,
      custoParcial,
      custoTotal: selecaoCompleta && idsSelecionados.length > 0 && !incompleto ? custoParcial : null,
      incompleto,
      problemas: Array.from(problemas),
    };
  }, [selecoes, opcoes, custosPorOpcao, selecaoCompleta]);

  const precoCriacaoNumero = numeroDoCampo(precoCriacao);

  const custoDasReceitas = resumoCustoSelecionado.custoTotal;
  const contasDaProducao = custoDasReceitas;
  const maoDeObra = custoDasReceitas;
  const custoTotalCriacao =
    custoDasReceitas != null ? custoDasReceitas * 3 : null;

  const sobraCriacao =
    custoTotalCriacao != null && Number.isFinite(precoCriacaoNumero)
      ? precoCriacaoNumero - custoTotalCriacao
      : null;

  const margemCriacao =
    sobraCriacao != null && precoCriacaoNumero > 0
      ? (sobraCriacao / precoCriacaoNumero) * 100
      : null;

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
    setTipoCustoOpcao("recipe");
    setInventoryItemOpcao("");
    setInventoryQuantityOpcao("");
    setInventoryUnitOpcao("unidade");
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
    setTipoCustoOpcao(opcao.cost_source);
    setInventoryItemOpcao(
      opcao.inventory_item_id == null ? "" : String(opcao.inventory_item_id)
    );
    setInventoryQuantityOpcao(
      opcao.inventory_quantity == null ? "" : String(opcao.inventory_quantity)
    );
    setInventoryUnitOpcao(opcao.inventory_unit ?? "unidade");
  }

  function fecharOpcao() {
    if (salvandoOpcao) return;
    setGrupoParaOpcao(null);
    setOpcaoEditando(null);
    setNomeOpcao("");
    setPrecoExtraOpcao("");
    setTipoCustoOpcao("recipe");
    setInventoryItemOpcao("");
    setInventoryQuantityOpcao("");
    setInventoryUnitOpcao("unidade");
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

    let inventoryItemId: number | null = null;
    let inventoryQuantity: number | null = null;
    let inventoryUnit: string | null = null;

    if (tipoCustoOpcao === "inventory") {
      inventoryItemId = Number(inventoryItemOpcao);
      inventoryQuantity = numeroDoCampo(inventoryQuantityOpcao);
      inventoryUnit = inventoryUnitOpcao;

      if (!inventoryItemId || Number.isNaN(inventoryItemId)) {
        setErro("Escolha o item que será usado do estoque.");
        return;
      }

      if (
        inventoryQuantity == null ||
        Number.isNaN(inventoryQuantity) ||
        inventoryQuantity <= 0
      ) {
        setErro("Informe quanto deste item é usado em uma unidade.");
        return;
      }
    }

    setSalvandoOpcao(true);
    setErro("");

    if (opcaoEditando) {
      const { error } = await supabase
        .from("sweet_part_options")
        .update({
          name: nomeOpcao.trim(),
          extra_price: extra,
          cost_source: tipoCustoOpcao,
          inventory_item_id: inventoryItemId,
          inventory_quantity: inventoryQuantity,
          inventory_unit: inventoryUnit,
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
        cost_source: tipoCustoOpcao,
        inventory_item_id: inventoryItemId,
        inventory_quantity: inventoryQuantity,
        inventory_unit: inventoryUnit,
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
    setTipoCustoOpcao("recipe");
    setInventoryItemOpcao("");
    setInventoryQuantityOpcao("");
    setInventoryUnitOpcao("unidade");
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
      <style jsx>{`
        .custom-v4-option-type {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-top: 6px;
        }

        .custom-v4-option-type button {
          min-height: 54px;
          border: 1px solid #eadfd8;
          border-radius: 14px;
          background: #fff;
          color: #806b62;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
        }

        .custom-v4-option-type button.active {
          border-color: #e6b9c6;
          background: #fff0f4;
          color: var(--brown);
          box-shadow: inset 0 0 0 1px #efcfda;
        }

        .custom-v4-inventory-box {
          display: grid;
          gap: 12px;
          margin-top: 12px;
          padding: 14px;
          border: 1px solid #eadfd8;
          border-radius: 16px;
          background: #fffaf8;
        }

        .custom-v4-qty-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 108px;
          gap: 8px;
        }

        .custom-v4-source-chip {
          display: inline-flex;
          align-items: center;
          width: fit-content;
          margin-top: 4px;
          padding: 4px 8px;
          border-radius: 999px;
          background: #f7efeb;
          color: #806b62;
          font-size: 10px;
          font-weight: 800;
        }

        .custom-v4-source-chip.inventory {
          background: #eef7ee;
          color: #527058;
        }

        .custom-v4-summary {
          margin-top: 16px;
          padding: 14px;
          border: 1px solid #eadfd8;
          border-radius: 18px;
          background: #fff;
        }

        .custom-v4-summary-title {
          margin-bottom: 10px;
          color: var(--brown);
          font-size: 13px;
          font-weight: 900;
        }

        .custom-v4-summary-list {
          display: grid;
          gap: 7px;
        }

        .custom-v4-summary-row {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          padding-bottom: 7px;
          border-bottom: 1px solid #f0e7e2;
          font-size: 12px;
        }

        .custom-v4-summary-row:last-child {
          padding-bottom: 0;
          border-bottom: 0;
        }

        .custom-v4-summary-row span {
          color: #8b766d;
        }

        .custom-v4-summary-row strong {
          color: var(--brown);
          text-align: right;
        }

        .custom-v4-cost-card {
          margin-top: 14px;
          padding: 15px;
          border: 1px solid #eadfd8;
          border-radius: 18px;
          background: #fffaf8;
        }

        .custom-v4-cost-lines {
          display: grid;
          gap: 9px;
          margin-top: 10px;
        }

        .custom-v4-cost-line {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          color: #7d6960;
          font-size: 13px;
        }

        .custom-v4-cost-line strong {
          color: var(--brown);
          font-size: 14px;
        }

        .custom-v4-cost-total {
          margin-top: 3px;
          padding-top: 10px;
          border-top: 1px solid #e7d9d2;
        }

        .custom-v4-cost-total span,
        .custom-v4-cost-total strong {
          color: var(--brown);
          font-weight: 900;
        }

        .custom-v4-price-card {
          margin-top: 14px;
          padding: 15px;
          border: 1px solid #eadfd8;
          border-radius: 18px;
          background: #fff;
        }

        .custom-v4-price-result {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #efe5e0;
        }

        .custom-v4-price-result span {
          color: #806b62;
          font-size: 12px;
          font-weight: 700;
        }

        .custom-v4-price-result strong {
          color: var(--brown);
          font-size: 20px;
        }

        .custom-v4-price-result.negative strong {
          color: #b64b40;
        }

        .custom-v4-margin {
          margin-top: 4px;
          color: #9a847a;
          font-size: 11px;
          text-align: right;
        }

        .custom-v4-modal-actions {
          display: grid;
          grid-template-columns: 100px minmax(0, 1fr);
          gap: 8px;
          margin-top: 16px;
        }

        .custom-v4-cancel {
          min-height: 46px;
          border: 1px solid #e4d8d2;
          border-radius: 14px;
          background: #fff;
          color: #806b62;
          font-weight: 800;
        }

        @media (max-width: 420px) {
          .custom-v4-option-type {
            grid-template-columns: 1fr;
          }

          .custom-v4-qty-grid {
            grid-template-columns: minmax(0, 1fr) 94px;
          }
        }
      `}</style>
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
              Cadastre as opções e monte seus personalizados.
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

                              <small className="custom-builder-option-cost">
                                {custosPorOpcao[opcao.id]?.custoUnitario != null
                                  ? `${opcao.cost_source === "inventory" ? "Custo direto" : "Custo da receita"}: ${formatarPreco(custosPorOpcao[opcao.id].custoUnitario!)}`
                                  : opcao.cost_source === "inventory"
                                    ? "Custo direto pendente"
                                    : custosPorOpcao[opcao.id]?.semReceita
                                      ? "Sem receita"
                                      : "Custo pendente"}
                              </small>

                              <span
                                className={`custom-v4-source-chip ${
                                  opcao.cost_source === "inventory" ? "inventory" : ""
                                }`}
                              >
                                {opcao.cost_source === "inventory"
                                  ? "📦 Item do estoque"
                                  : "🍰 Usa receita"}
                              </span>

                              {opcao.cost_source === "inventory" &&
                                opcao.inventory_item_id != null &&
                                opcao.inventory_quantity != null && (
                                  <small className="custom-builder-option-cost">
                                    {estoqueDireto.find(
                                      (item) => item.id === opcao.inventory_item_id
                                    )?.name ?? "Item do estoque"}
                                    {" • "}
                                    {opcao.inventory_quantity.toLocaleString("pt-BR", {
                                      maximumFractionDigits: 3,
                                    })}{" "}
                                    {formatarUnidade(opcao.inventory_unit ?? "unidade")}
                                    {" por unidade"}
                                  </small>
                                )}
                            </div>

                            <div className="custom-builder-option-actions">
                              <button
                                type="button"
                                onClick={() => abrirEditarOpcao(grupo, opcao)}
                              >
                                Editar
                              </button>

                              {opcao.cost_source === "recipe" && (
                                <Link
                                  href={`/doces/categoria/${categoriaId}/personalizado/${doceId}/opcao/${opcao.id}/receita`}
                                  className="custom-builder-recipe-action"
                                >
                                  Receita
                                </Link>
                              )}

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
                <label>Como esta opção é usada?</label>

                <div className="custom-v4-option-type">
                  <button
                    type="button"
                    className={tipoCustoOpcao === "recipe" ? "active" : ""}
                    onClick={() => {
                      setTipoCustoOpcao("recipe");
                      setInventoryItemOpcao("");
                      setInventoryQuantityOpcao("");
                    }}
                  >
                    🍰 Receita feita por ela
                  </button>

                  <button
                    type="button"
                    className={tipoCustoOpcao === "inventory" ? "active" : ""}
                    onClick={() => setTipoCustoOpcao("inventory")}
                  >
                    📦 Item pronto do estoque
                  </button>
                </div>
              </div>

              {tipoCustoOpcao === "inventory" && (
                <div className="custom-v4-inventory-box">
                  <div className="form-group">
                    <label>Qual item do estoque?</label>

                    <select
                      value={inventoryItemOpcao}
                      onChange={(evento) => {
                        const novoId = evento.target.value;
                        setInventoryItemOpcao(novoId);

                        const item = estoqueDireto.find(
                          (estoqueItem) => estoqueItem.id === Number(novoId)
                        );

                        if (item) {
                          setInventoryUnitOpcao(unidadeInicial(item.unit));
                        }
                      }}
                    >
                      <option value="">Selecione...</option>
                      {estoqueDireto.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="custom-v4-qty-grid">
                    <div className="form-group">
                      <label>Quanto usa por unidade?</label>
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        value={inventoryQuantityOpcao}
                        onChange={(evento) =>
                          setInventoryQuantityOpcao(evento.target.value)
                        }
                        placeholder="Ex.: 50"
                      />
                    </div>

                    <div className="form-group">
                      <label>Unidade</label>
                      <select
                        value={inventoryUnitOpcao}
                        onChange={(evento) =>
                          setInventoryUnitOpcao(evento.target.value)
                        }
                      >
                        {unidadesPermitidas(
                          estoqueDireto.find(
                            (item) => item.id === Number(inventoryItemOpcao)
                          )?.unit ?? "unidade"
                        ).map((unidade) => (
                          <option key={unidade} value={unidade}>
                            {formatarUnidade(unidade)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <small>
                    Ex.: 50 g de morango, 30 g de Nutella ou 2 un de Oreo.
                  </small>
                </div>
              )}

              <div className="form-group">
                <label>Acréscimo no preço <small>(opcional)</small></label>

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
                  É só quanto você quer cobrar a mais. O custo é calculado separadamente.
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

              {resumoCustoSelecionado.quantidadeSelecionada > 0 && (
                <div className="custom-v4-summary">
                  <div className="custom-v4-summary-title">
                    Seu personalizado
                  </div>

                  <div className="custom-v4-summary-list">
                    {grupos.flatMap((grupo) =>
                      (selecoes[grupo.id] ?? []).map((opcaoId) => {
                        const opcao = opcoes.find((item) => item.id === opcaoId);
                        if (!opcao) return null;

                        return (
                          <div
                            key={`${grupo.id}-${opcao.id}`}
                            className="custom-v4-summary-row"
                          >
                            <span>{grupo.name}</span>
                            <strong>{opcao.name}</strong>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              <div className="custom-v4-cost-card">
                <span className="section-kicker">CUSTO</span>

                <div className="custom-v4-cost-lines">
                  <div className="custom-v4-cost-line">
                    <span>Custo das receitas e itens</span>
                    <strong>
                      {custoDasReceitas != null
                        ? formatarPreco(custoDasReceitas)
                        : resumoCustoSelecionado.quantidadeSelecionada > 0
                          ? formatarPreco(resumoCustoSelecionado.custoParcial)
                          : "—"}
                    </strong>
                  </div>

                  <div className="custom-v4-cost-line">
                    <span>Contas da produção</span>
                    <strong>
                      {contasDaProducao != null
                        ? formatarPreco(contasDaProducao)
                        : "—"}
                    </strong>
                  </div>

                  <div className="custom-v4-cost-line">
                    <span>Mão de obra</span>
                    <strong>
                      {maoDeObra != null
                        ? formatarPreco(maoDeObra)
                        : "—"}
                    </strong>
                  </div>

                  <div className="custom-v4-cost-line custom-v4-cost-total">
                    <span>Total de custo</span>
                    <strong>
                      {custoTotalCriacao != null
                        ? formatarPreco(custoTotalCriacao)
                        : "—"}
                    </strong>
                  </div>
                </div>

                {!selecaoCompleta ? (
                  <div className="custom-builder-pricing-warning">
                    Termine as escolhas acima para calcular o custo.
                  </div>
                ) : resumoCustoSelecionado.incompleto ? (
                  <div className="custom-builder-pricing-warning">
                    <strong>Custo incompleto</strong>
                    <span>
                      Confira receita ou histórico de compra em: {resumoCustoSelecionado.problemas.join(", ")}.
                    </span>
                  </div>
                ) : null}
              </div>

              <div className="custom-v4-price-card">
                <span className="section-kicker">PREÇO DE VENDA</span>

              <div className="form-group custom-builder-final-price">
                <label>Preço de venda</label>

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

              </div>

                <div
                  className={`custom-v4-price-result ${
                    sobraCriacao != null && sobraCriacao < 0 ? "negative" : ""
                  }`}
                >
                  <span>Sobra estimada</span>
                  <strong>
                    {sobraCriacao != null
                      ? formatarPreco(sobraCriacao)
                      : "—"}
                  </strong>
                </div>

                {margemCriacao != null && (
                  <div className="custom-v4-margin">
                    Margem {margemCriacao.toLocaleString("pt-BR", {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}%
                  </div>
                )}
              </div>

              {erro && <div className="form-error">{erro}</div>}

              <div className="custom-v4-modal-actions">
                <button
                  type="button"
                  className="custom-v4-cancel"
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

        {/* As receitas das opções agora usam a rota própria de receita. */}

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
