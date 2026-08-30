"use client";

import {
  Children,
  forwardRef,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { CheckIcon, ChevronDownIcon } from "@heroicons/react/20/solid";
import { nextSelectOption } from "@/lib/ui/select-navigation";
import { cn } from "@/lib/utils";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean;
  density?: "default" | "compact";
  portalContainer?: HTMLElement | null;
};

type Choice = {
  value: string;
  label: string;
  disabled: boolean;
  group?: string;
};

type MenuPosition = {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
};

const MENU_MAX_HEIGHT = 280;
const MENU_MIN_HEIGHT_BELOW = 120;
const MENU_GAP = 6;
const VIEWPORT_MARGIN = 8;

function textOf(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) =>
      isValidElement<{ children?: ReactNode }>(child)
        ? textOf(child.props.children)
        : String(child),
    )
    .join("");
}

function choicesOf(
  children: ReactNode,
  group?: string,
  disabled = false,
): Choice[] {
  return Children.toArray(children).flatMap((child) => {
    if (
      !isValidElement<{
        children?: ReactNode;
        value?: string | number;
        disabled?: boolean;
        label?: string;
      }>(child)
    ) {
      return [];
    }

    if (child.type === "option") {
      return [
        {
          value: String(
            child.props.value ?? textOf(child.props.children),
          ),
          label:
            child.props.label ?? textOf(child.props.children),
          disabled: disabled || Boolean(child.props.disabled),
          group,
        },
      ];
    }

    return choicesOf(
      child.props.children,
      child.type === "optgroup" ? child.props.label : group,
      disabled || Boolean(child.props.disabled),
    );
  });
}

/**
 * Native select is kept only as the form bridge.
 * The visible control is a custom select-only combobox.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select(
    {
      className,
      invalid = false,
      density = "default",
      portalContainer,
      children,
      id,
      value,
      defaultValue,
      disabled,
      required,
      onChange,
      ...props
    },
    ref,
  ) {
    const uid = useId();

    const button = useRef<HTMLButtonElement>(null);
    const native = useRef<HTMLSelectElement | null>(null);
    const menu = useRef<HTMLDivElement>(null);

    const choices = choicesOf(children);

    const [current, setCurrent] = useState(
      String(value ?? defaultValue ?? choices[0]?.value ?? ""),
    );

    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(-1);
    const [label, setLabel] = useState<string>();
    const [validationError, setValidationError] = useState(false);

    const [position, setPosition] = useState<MenuPosition>({
      left: 0,
      top: 0,
      width: 0,
      maxHeight: MENU_MAX_HEIGHT,
    });

    const search = useRef({
      value: "",
      at: 0,
    });

    const selected = choices.find(
      (choice) => choice.value === String(value ?? current),
    );

    useEffect(() => {
      const element = native.current;

      if (!element) {
        return;
      }

      // Read browser-resolved value for uncontrolled forms
      // and option lists that may change.
      setCurrent(element.value);

      const reset = () => {
        requestAnimationFrame(() => {
          setCurrent(element.value);
          setValidationError(false);
          setOpen(false);
        });
      };

      element.form?.addEventListener("reset", reset);

      const parentLabel = button.current?.closest("label");

      if (parentLabel) {
        const clone = parentLabel.cloneNode(true) as HTMLElement;

        clone
          .querySelectorAll("button,select")
          .forEach((node) => node.remove());

        setLabel(clone.textContent?.trim());
      }

      return () => {
        element.form?.removeEventListener("reset", reset);
      };
    }, [children]);

    useEffect(() => {
      if (disabled) {
        setOpen(false);
      }
    }, [disabled]);

    useEffect(() => {
      if (!open || disabled) {
        return;
      }

      function place() {
        const rect = button.current?.getBoundingClientRect();

        if (!rect) {
          return;
        }

        const below = Math.max(
          0,
          window.innerHeight -
            rect.bottom -
            MENU_GAP -
            VIEWPORT_MARGIN,
        );

        const above = Math.max(
          0,
          rect.top - MENU_GAP - VIEWPORT_MARGIN,
        );

        const groupCount = choices.reduce((count, choice, index) => {
          if (
            choice.group &&
            choice.group !== choices[index - 1]?.group
          ) {
            return count + 1;
          }

          return count;
        }, 0);

        const estimatedHeight = Math.min(
          MENU_MAX_HEIGHT,
          Math.max(
            44,
            choices.length * 36 + groupCount * 28 + 8,
          ),
        );

        /**
         * Prefer opening DOWN.
         *
         * Only flip above when there is genuinely too little usable
         * space below and more room exists above.
         */
        const openDown =
          below >=
            Math.min(
              MENU_MIN_HEIGHT_BELOW,
              estimatedHeight,
            ) || below >= above;

        const availableHeight = openDown ? below : above;

        const maxHeight = Math.max(
          1,
          Math.min(MENU_MAX_HEIGHT, availableHeight),
        );

        const renderedHeight = Math.min(
          estimatedHeight,
          maxHeight,
        );

        const top = openDown
          ? rect.bottom + MENU_GAP
          : Math.max(
              VIEWPORT_MARGIN,
              rect.top - MENU_GAP - renderedHeight,
            );

        setPosition({
          left: rect.left,
          top,
          width: rect.width,
          maxHeight,
        });
      }

      function outside(event: PointerEvent) {
        const target = event.target as Node;

        if (
          !button.current?.contains(target) &&
          !menu.current?.contains(target)
        ) {
          setOpen(false);
        }
      }

      const resizeObserver =
        typeof ResizeObserver === "undefined"
          ? null
          : new ResizeObserver(place);

      if (button.current) {
        resizeObserver?.observe(button.current);
      }

      place();

      document.addEventListener("pointerdown", outside);
      window.addEventListener("resize", place);
      window.addEventListener("scroll", place, true);

      return () => {
        resizeObserver?.disconnect();

        document.removeEventListener("pointerdown", outside);
        window.removeEventListener("resize", place);
        window.removeEventListener("scroll", place, true);
      };
    }, [open, disabled, choices]);

    useEffect(() => {
      if (!open) {
        return;
      }

      menu.current
        ?.querySelector('[data-active="true"]')
        ?.scrollIntoView({
          block: "nearest",
        });
    }, [active, open]);

    function choose(index: number) {
      const choice = choices[index];

      if (!choice || choice.disabled || disabled) {
        return;
      }

      if (native.current) {
        native.current.value = choice.value;

        setCurrent(choice.value);

        native.current.dispatchEvent(
          new Event("change", {
            bubbles: true,
          }),
        );
      }

      setValidationError(false);
      setOpen(false);

      button.current?.focus({ preventScroll: true });
    }

    function show(direction = 1) {
      const selectedIndex = choices.findIndex(
        (choice) =>
          choice.value === selected?.value && !choice.disabled,
      );

      setActive(Math.max(0, selectedIndex));

      if (!selected || selected.disabled) {
        setActive(
          direction === 1
            ? choices.findIndex((choice) => !choice.disabled)
            : choices
                .map((choice) => !choice.disabled)
                .lastIndexOf(true),
        );
      }

      setOpen(true);
    }

    function keyDown(
      event: KeyboardEvent<HTMLButtonElement>,
    ) {
      if (
        [
          "ArrowDown",
          "ArrowUp",
          "Home",
          "End",
          "Enter",
          " ",
        ].includes(event.key)
      ) {
        event.preventDefault();

        if (event.key === "Enter" || event.key === " ") {
          if (open) {
            choose(active);
          } else {
            show();
          }

          return;
        }

        if (!open) {
          if (
            event.key === "Home" ||
            event.key === "End"
          ) {
            setActive(
              nextSelectOption(
                choices,
                -1,
                event.key,
              ),
            );

            setOpen(true);
          } else {
            show(event.key === "ArrowUp" ? -1 : 1);
          }

          return;
        }

        setActive(
          nextSelectOption(
            choices,
            active,
            event.key,
          ),
        );
      } else if (event.key === "Escape") {
        if (open) {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
        }
      } else if (event.key === "Tab") {
        setOpen(false);
      } else if (
        event.key.length === 1 &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        event.preventDefault();

        const now = Date.now();

        search.current = {
          value:
            (now - search.current.at < 700
              ? search.current.value
              : "") +
            event.key.toLocaleLowerCase("ro"),
          at: now,
        };

        const index = choices.findIndex(
          (choice) =>
            !choice.disabled &&
            choice.label
              .toLocaleLowerCase("ro")
              .startsWith(search.current.value),
        );

        if (index >= 0) {
          setActive(index);
          setOpen(true);
        }
      }
    }

    const describedBy =
      [
        props["aria-describedby"],
        validationError ? `${uid}-error` : null,
      ]
        .filter(Boolean)
        .join(" ") || undefined;

    return (
      <span className="relative block min-w-0">
        <select
          {...props}
          ref={(node) => {
            native.current = node;

            if (typeof ref === "function") {
              ref(node);
            } else if (ref) {
              ref.current = node;
            }
          }}
          value={value}
          defaultValue={defaultValue}
          disabled={disabled}
          required={required}
          tabIndex={-1}
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 h-px w-px opacity-0"
          onFocus={() => button.current?.focus()}
          onInvalid={(event) => {
            event.preventDefault();
            setValidationError(true);
            button.current?.focus();
            show();
          }}
          onChange={(event) => {
            setCurrent(event.target.value);
            onChange?.(event);
          }}
        >
          {children}
        </select>

        <button
          ref={button}
          id={id}
          type="button"
          role="combobox"
          disabled={disabled}
          aria-expanded={open && !disabled}
          aria-controls={uid}
          aria-haspopup="listbox"
          aria-activedescendant={
            open && active >= 0
              ? `${uid}-${active}`
              : undefined
          }
          aria-label={props["aria-label"] ?? label}
          aria-labelledby={props["aria-labelledby"]}
          aria-describedby={describedBy}
          aria-required={required}
          aria-invalid={
            invalid ||
            validationError ||
            props["aria-invalid"] ||
            undefined
          }
          title={selected?.label}
          onClick={() =>
            open ? setOpen(false) : show()
          }
          onKeyDown={keyDown}
          className={cn(
            "focus-ring flex w-full items-center justify-between gap-2 rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-1 text-left text-sm font-normal text-[rgb(var(--foreground))] transition-colors hover:border-[rgb(var(--border-strong))] disabled:cursor-not-allowed disabled:opacity-50",
            (invalid || validationError) &&
              "border-[rgb(var(--danger-border))]",
            density === "compact"
              ? "h-[var(--control-height-compact)]"
              : "h-[var(--control-height)]",
            className,
          )}
        >
          <span className="min-w-0 truncate">
            {selected?.label ?? "Selectează"}
          </span>

          <ChevronDownIcon
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-[rgb(var(--text-muted))]"
          />
        </button>

        {validationError ? (
          <span
            id={`${uid}-error`}
            role="alert"
            className="mt-1 block text-xs text-[rgb(var(--danger-text))]"
          >
            Selectează o opțiune pentru a continua.
          </span>
        ) : null}

        {open && !disabled
          ? createPortal(
              <div
                ref={menu}
                id={uid}
                role="listbox"
                aria-label={
                  props["aria-label"] ??
                  label ??
                  "Opțiuni"
                }
                style={{
                  position: "fixed",
                  left: position.left,
                  top: position.top,
                  width: position.width,
                  maxHeight: position.maxHeight,
                  zIndex: portalContainer ? 2 : 100,
                }}
                className="product-popup overflow-y-auto overscroll-contain rounded-control border border-[rgb(var(--border-strong))] bg-[rgb(var(--surface-floating))] p-1 shadow-none"
              >
                {choices.map((choice, index) => (
                  <div
                    key={`${choice.value}:${index}`}
                  >
                    {choice.group &&
                    choice.group !==
                      choices[index - 1]?.group ? (
                      <p className="px-3 pb-1 pt-3 text-metadata font-semibold text-[rgb(var(--text-muted))]">
                        {choice.group}
                      </p>
                    ) : null}

                    <div
                      id={`${uid}-${index}`}
                      role="option"
                      aria-selected={
                        choice.value ===
                        selected?.value
                      }
                      aria-disabled={choice.disabled}
                      data-active={
                        index === active
                      }
                      onPointerMove={() => {
                        if (!choice.disabled) {
                          setActive(index);
                        }
                      }}
                      onMouseDown={(event) =>
                        event.preventDefault()
                      }
                      onClick={() => choose(index)}
                      className={cn(
                        "flex min-h-9 cursor-pointer items-center justify-between gap-3 rounded-[5px] px-3 py-2 text-xs leading-5 text-[rgb(var(--foreground))] transition-colors",
                        index === active &&
                          "bg-[rgb(var(--interaction-tint))] ring-1 ring-inset ring-[rgb(var(--interaction-border))]",
                        choice.disabled &&
                          "cursor-not-allowed opacity-40",
                      )}
                    >
                      <span className="min-w-0 truncate">
                        {choice.label}
                      </span>

                      {choice.value ===
                      selected?.value ? (
                        <CheckIcon
                          aria-hidden="true"
                          className="h-4 w-4 shrink-0 text-[rgb(var(--interaction))]"
                        />
                      ) : null}
                    </div>
                  </div>
                ))}

                {!choices.length ? (
                  <p className="px-3 py-2 text-xs text-[rgb(var(--text-muted))]">
                    Nicio opțiune disponibilă.
                  </p>
                ) : null}
              </div>,
              portalContainer ?? document.body,
            )
          : null}
      </span>
    );
  },
);
