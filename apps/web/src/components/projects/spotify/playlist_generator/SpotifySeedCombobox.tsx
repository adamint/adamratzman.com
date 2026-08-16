import {
  Box,
  Input,
  Tag,
  TagCloseButton,
  TagLabel,
  Text,
  Wrap,
  WrapItem,
} from '@chakra-ui/react';
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import type {
  AutocompleteOption,
  SelectedObjects,
} from '../../../../routes/projects/spotify/recommend';

type SpotifySeedComboboxProps = {
  inputText: string;
  options: AutocompleteOption[];
  selectedObjects: SelectedObjects;
  onInputTextChange: (inputText: string) => void;
  onRemove: (uri: string) => void;
  onSelect: (option: AutocompleteOption) => void;
};

const optionGroups: Array<{
  label: string;
  type: AutocompleteOption['type'];
}> = [
  { label: 'Tracks', type: 'track' },
  { label: 'Artists', type: 'artist' },
  { label: 'Genres', type: 'genre' },
];

export function SpotifySeedCombobox({
  inputText,
  onInputTextChange,
  onRemove,
  onSelect,
  options,
  selectedObjects,
}: SpotifySeedComboboxProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const instanceId = useId().replaceAll(':', '');
  const inputId = `spotify-search-input-${instanceId}`;
  const listboxId = `spotify-search-suggestions-${instanceId}`;
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const hasQuery = inputText.trim().length > 0;
  const displayedOptions = useMemo(() => optionGroups.flatMap(group => (
    options.filter(option => option.type === group.type)
  )), [options]);
  const listboxOpen = isOpen && hasQuery && displayedOptions.length > 0;
  const activeOption = listboxOpen && activeIndex >= 0
    ? displayedOptions[activeIndex]
    : undefined;

  useEffect(() => {
    setActiveIndex(-1);
  }, [displayedOptions]);

  function closeListbox() {
    setIsOpen(false);
    setActiveIndex(-1);
  }

  function selectOption(option: AutocompleteOption) {
    onSelect(option);
    onInputTextChange('');
    closeListbox();
    inputRef.current?.focus();
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const nextInputText = event.target.value;
    onInputTextChange(nextInputText);
    setActiveIndex(-1);
    setIsOpen(nextInputText.trim().length > 0);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      if (isOpen || inputText) event.preventDefault();
      onInputTextChange('');
      closeListbox();
      return;
    }
    if (!hasQuery || displayedOptions.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex(previousIndex => (
        previousIndex < displayedOptions.length - 1 ? previousIndex + 1 : 0
      ));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex(previousIndex => (
        previousIndex > 0 ? previousIndex - 1 : displayedOptions.length - 1
      ));
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex(0);
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex(displayedOptions.length - 1);
      return;
    }
    if (event.key === 'Enter' && activeOption) {
      event.preventDefault();
      selectOption(activeOption);
    }
  }

  return <Box>
    {Object.keys(selectedObjects).length > 0 && <Wrap mb={2}>
      {Object.values(selectedObjects).map(option => <WrapItem key={option.uri}>
        <Tag colorScheme={getTagColorScheme(option.type)}>
          <TagLabel>{option.textMapper()}</TagLabel>
          <TagCloseButton
            aria-label={`Remove ${getVisibleOptionText(option)} from seeds`}
            onClick={() => {
              onRemove(option.uri);
              inputRef.current?.focus();
            }}
          />
        </Tag>
      </WrapItem>)}
    </Wrap>}
    <Input
      aria-activedescendant={activeOption
        ? getOptionId(listboxId, activeOption.uri)
        : undefined}
      aria-autocomplete='list'
      aria-controls={listboxOpen ? listboxId : undefined}
      aria-expanded={listboxOpen}
      aria-label='Spotify tracks, artists, or genres'
      autoComplete='off'
      autoFocus
      id={inputId}
      onBlur={closeListbox}
      onChange={handleInputChange}
      onFocus={() => setIsOpen(hasQuery)}
      onKeyDown={handleKeyDown}
      placeholder='Enter a Spotify track, artist, or genre...'
      ref={inputRef}
      role='combobox'
      value={inputText}
      variant='filled'
    />
    {listboxOpen && <Box
      aria-label='Spotify search suggestions'
      as='ul'
      borderColor='gray.200'
      borderRadius='md'
      borderWidth='1px'
      id={listboxId}
      listStyleType='none'
      m={0}
      maxH='24rem'
      mt={1}
      overflowY='auto'
      p={0}
      role='listbox'
    >
      {optionGroups.map(group => {
        const groupedOptions = options.filter(
          option => option.type === group.type,
        );
        if (groupedOptions.length === 0) return null;

        return <Box
          as='li'
          borderBottomWidth={group.type === 'genre' ? 0 : '1px'}
          key={group.type}
          listStyleType='none'
          role='presentation'
        >
          <Text fontWeight='bold' px={3} py={2} textDecoration='underline'>
            {group.label}
          </Text>
          <Box as='ul' listStyleType='none' m={0} p={0} role='presentation'>
            {groupedOptions.map(option => {
              const optionIndex = displayedOptions.indexOf(option);
              const active = optionIndex === activeIndex;
              const selected = selectedObjects[option.uri] !== undefined;

              return <Box
                aria-selected={selected}
                as='li'
                bg={active ? 'gray.100' : undefined}
                cursor='pointer'
                id={getOptionId(listboxId, option.uri)}
                key={option.uri}
                onClick={() => selectOption(option)}
                onMouseMove={() => setActiveIndex(optionIndex)}
                onPointerDown={(event: PointerEvent<HTMLLIElement>) => {
                  event.preventDefault();
                }}
                px={3}
                py={2}
                role='option'
              >
                {option.textMapper()}
              </Box>;
            })}
          </Box>
        </Box>;
      })}
    </Box>}
  </Box>;
}

function getOptionId(listboxId: string, uri: string) {
  const safeUri = Array.from(uri).map(character => (
    /^[A-Za-z0-9_-]$/u.test(character)
      ? character
      : `-${character.codePointAt(0)?.toString(16) ?? '0'}-`
  )).join('');
  return `${listboxId}-option-${safeUri}`;
}

function getVisibleOptionText(option: AutocompleteOption) {
  if (option.displayText) return option.displayText;
  if (option.type === 'track' && option.additionalText) {
    return `${option.text} by ${option.additionalText}`;
  }
  return option.text;
}

function getTagColorScheme(type: AutocompleteOption['type']) {
  if (type === 'genre') return 'teal';
  if (type === 'track') return 'orange';
  return 'green';
}
