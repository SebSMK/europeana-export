	.section	__TEXT,__text,regular,pure_instructions
	.globl	__Z4funcv
	.align	4, 0x90
__Z4funcv:                              ## @_Z4funcv
	.cfi_startproc
	.cfi_personality 155, ___gxx_personality_v0
Leh_func_begin0:
	.cfi_lsda 16, Lexception0
## BB#0:
	pushq	%rbp
Ltmp11:
	.cfi_def_cfa_offset 16
Ltmp12:
	.cfi_offset %rbp, -16
	movq	%rsp, %rbp
Ltmp13:
	.cfi_def_cfa_register %rbp
	subq	$32, %rsp
Ltmp0:
	callq	__Z7do_workv
Ltmp1:
	jmp	LBB0_1
LBB0_1:
	jmp	LBB0_5
LBB0_2:
Ltmp2:
	movl	%edx, %ecx
	movq	%rax, -8(%rbp)
	movl	%ecx, -12(%rbp)
## BB#3:
	movq	-8(%rbp), %rdi
	callq	___cxa_begin_catch
Ltmp3:
	movq	%rax, -24(%rbp)         ## 8-byte Spill
	callq	__Z12handle_errorv
Ltmp4:
	jmp	LBB0_4
LBB0_4:
	callq	___cxa_end_catch
LBB0_5:
	addq	$32, %rsp
	popq	%rbp
	ret
LBB0_6:
Ltmp5:
	movl	%edx, %ecx
	movq	%rax, -8(%rbp)
	movl	%ecx, -12(%rbp)
Ltmp6:
	callq	___cxa_end_catch
Ltmp7:
	jmp	LBB0_7
LBB0_7:
	jmp	LBB0_8
LBB0_8:
	movq	-8(%rbp), %rdi
	callq	__Unwind_Resume
LBB0_9:
Ltmp8:
	movl	%edx, %ecx
	movq	%rax, %rdi
	movl	%ecx, -28(%rbp)         ## 4-byte Spill
	callq	___clang_call_terminate
	.cfi_endproc
Leh_func_end0:
	.section	__TEXT,__gcc_except_tab
	.align	2
GCC_except_table0:
Lexception0:
	.byte	255                     ## @LPStart Encoding = omit
	.byte	155                     ## @TType Encoding = indirect pcrel sdata4
	.asciz	"\326\200\200"          ## @TType base offset
	.byte	3                       ## Call site Encoding = udata4
	.byte	78                      ## Call site table length
Lset0 = Ltmp0-Leh_func_begin0           ## >> Call Site 1 <<
	.long	Lset0
Lset1 = Ltmp1-Ltmp0                     ##   Call between Ltmp0 and Ltmp1
	.long	Lset1
Lset2 = Ltmp2-Leh_func_begin0           ##     jumps to Ltmp2
	.long	Lset2
	.byte	1                       ##   On action: 1
Lset3 = Ltmp1-Leh_func_begin0           ## >> Call Site 2 <<
	.long	Lset3
Lset4 = Ltmp3-Ltmp1                     ##   Call between Ltmp1 and Ltmp3
	.long	Lset4
	.long	0                       ##     has no landing pad
	.byte	0                       ##   On action: cleanup
Lset5 = Ltmp3-Leh_func_begin0           ## >> Call Site 3 <<
	.long	Lset5
Lset6 = Ltmp4-Ltmp3                     ##   Call between Ltmp3 and Ltmp4
	.long	Lset6
Lset7 = Ltmp5-Leh_func_begin0           ##     jumps to Ltmp5
	.long	Lset7
	.byte	0                       ##   On action: cleanup
Lset8 = Ltmp4-Leh_func_begin0           ## >> Call Site 4 <<
	.long	Lset8
Lset9 = Ltmp6-Ltmp4                     ##   Call between Ltmp4 and Ltmp6
	.long	Lset9
	.long	0                       ##     has no landing pad
	.byte	0                       ##   On action: cleanup
Lset10 = Ltmp6-Leh_func_begin0          ## >> Call Site 5 <<
	.long	Lset10
Lset11 = Ltmp7-Ltmp6                    ##   Call between Ltmp6 and Ltmp7
	.long	Lset11
Lset12 = Ltmp8-Leh_func_begin0          ##     jumps to Ltmp8
	.long	Lset12
	.byte	1                       ##   On action: 1
Lset13 = Ltmp7-Leh_func_begin0          ## >> Call Site 6 <<
	.long	Lset13
Lset14 = Leh_func_end0-Ltmp7            ##   Call between Ltmp7 and Leh_func_end0
	.long	Lset14
	.long	0                       ##     has no landing pad
	.byte	0                       ##   On action: cleanup
	.byte	1                       ## >> Action Record 1 <<
                                        ##   Catch TypeInfo 1
	.byte	0                       ##   No further actions
                                        ## >> Catch TypeInfos <<
	.long	0                       ## TypeInfo 1
	.align	2

	.section	__TEXT,__textcoal_nt,coalesced,pure_instructions
	.private_extern	___clang_call_terminate
	.globl	___clang_call_terminate
	.weak_def_can_be_hidden	___clang_call_terminate
	.align	4, 0x90
___clang_call_terminate:                ## @__clang_call_terminate
## BB#0:
	pushq	%rbp
	movq	%rsp, %rbp
	subq	$16, %rsp
	callq	___cxa_begin_catch
	movq	%rax, -8(%rbp)          ## 8-byte Spill
	callq	__ZSt9terminatev

	.section	__TEXT,__eh_frame,coalesced,no_toc+strip_static_syms+live_support

.subsections_via_symbols
