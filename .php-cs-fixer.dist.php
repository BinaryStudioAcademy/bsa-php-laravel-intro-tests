<?php

$finder = \PhpCsFixer\Finder::create()
    ->in(__DIR__ . '/src')
;

return (new \PhpCsFixer\Config)
    ->setRules([
        '@PSR2' => true,
        'array_syntax' => ['syntax' => 'short'],
        'no_empty_comment' => true,
        'array_indentation' => true
    ])
    ->setFinder($finder)
;